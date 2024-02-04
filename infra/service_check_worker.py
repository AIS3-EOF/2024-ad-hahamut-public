import logging

logging.basicConfig()
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

from api import connect_worker_api, WorkerApi
import json, time, logging, signal, os
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor
import concurrent
import subprocess, requests, traceback, random
from dataclasses import dataclass
from hashlib import sha256


def handle_interrupt(*args, **kwargs):
    logger.info("Signal received, raising KeyboardInterrupt...")
    raise KeyboardInterrupt


signal.signal(signal.SIGINT, handle_interrupt)
signal.signal(signal.SIGTERM, handle_interrupt)


def poll_jobs(api: WorkerApi, team_ids, *jobtypes, interval=5):
    while True:
        for jt in jobtypes:
            jobs = api.job_take_retry(jt, team_ids)
            random.shuffle(jobs)
            for j in jobs:
                yield j
            time.sleep(interval)


def check(api, job):
    job = api.job_get(job["id"])
    if job["status"] == "Expired":
        logger.info(
            "Job Expired: round_id=%s, job_id=%s, team_id=%s",
            job["round_id"],
            job["id"],
            job["team_id"],
        )
        return
    logger.info("Checking job: %s", job)
    ip = f'10.102.{job["team_id"]}.20'
    # ip = f"10.102.10.20"  # TESTING ONLY
    port = 8763
    url = f"http://{ip}:{port}/"

    try:
        env_file = subprocess.check_output(
            f"ssh -oStrictHostKeyChecking=no -oLogLevel=ERROR {ip} -i keys/priv cat /opt/hahamut/service/.env",
            shell=True,
            timeout=2,
            stderr=subprocess.DEVNULL,
        )
        admin_pwd = env_file.decode().split("ADMIN_PASSWORD=")[1].split("\n")[0]
        flag = subprocess.check_output(
            f"ssh -oStrictHostKeyChecking=no -oLogLevel=ERROR {ip} -i keys/priv cat /opt/hahamut/service/flag",
            shell=True,
            timeout=2,
            stderr=subprocess.DEVNULL,
        ).decode()
        logger.info(
            "Info: round_id=%s, job_id=%s, team_id=%s, flag=%r, admin_pwd=%r",
            job["round_id"],
            job["id"],
            job["team_id"],
            flag,
            admin_pwd,
        )
        job["flag"] = flag
        job["admin_pwd"] = admin_pwd
    except Exception as e:
        logger.info(
            "Error: round_id=%s, job_id=%s, team_id=%s, msg=%r",
            job["round_id"],
            job["id"],
            job["team_id"],
            "Failed to get flag or admin password",
        )
        api.job_result(job["id"], "Success", json.dumps({"result": "Failed"}))
        return

    fname = f'logs/service_check_{job["id"]}.log'
    with open(fname, "wb") as f:
        f.write(json.dumps(job).encode() + b"\n")
        f.flush()

        # check results
        success = True
        msg = ""

        start = time.time()
        try:
            suffix = os.urandom(8).hex()
            remote_hash = requests.get(
                url + "flaghash", params={"suffix": suffix}, timeout=3
            ).text
            local_hash = sha256((flag + suffix).encode()).hexdigest()
            if local_hash != remote_hash:
                success = False
                msg = f"Hash mismatch: {local_hash} != {remote_hash}"
            if success:
                proc = subprocess.Popen(
                    ["node", "index.js", url],
                    cwd="checker",
                    stdin=subprocess.DEVNULL,
                    stdout=f,
                    stderr=f,
                    env={"ADMIN_PASSWORD": admin_pwd},
                )
                proc.wait()
                success = proc.returncode == 0
        except KeyboardInterrupt:
            raise  # special case, don't catch
        except Exception as e:
            success = False
            err_msg = traceback.format_exc()
            f.write(err_msg.encode())
            msg = f"Error occurred, see {fname} for details"

        f.write(f"Success: {success}\n".encode())
        elapsed = time.time() - start
        f.write(f"Elapsed: {elapsed}\n".encode())
        logger.info(
            "Done: round_id=%s, job_id=%s, team_id=%s, success=%r, elapsed=%s, msg=%r",
            job["round_id"],
            job["id"],
            job["team_id"],
            success,
            elapsed,
            msg,
        )
    if success:
        api.job_result(job["id"], "Success", json.dumps({"result": "Success"}))
    else:
        api.job_result(job["id"], "Success", json.dumps({"result": "Failed"}))


with connect_worker_api("service_check", logger=logger) as api, ThreadPoolExecutor(
    max_workers=4
) as executor:
    try:
        team_ids = [t["id"] for t in api.teams_get()]
        for job in poll_jobs(api, team_ids, "CheckService"):
            logger.info("Job received: %s", job)
            executor.submit(check, api, job)
    except KeyboardInterrupt:
        logger.info("Force exiting...")
        os._exit(0)
