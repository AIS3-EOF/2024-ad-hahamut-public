import logging

logging.basicConfig()
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

from api import connect_worker_api, WorkerApi
import json, time, logging, signal, os, subprocess, random, traceback
from tempfile import NamedTemporaryFile


def handle_interrupt(*args, **kwargs):
    exit()


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


def send_result(job_id, result, feedback, msg):
    api.job_result(job_id, result, json.dumps({"feedback": feedback, "msg": msg}))
    logger.info("job=%s, result=%s, feedback=%s, msg=%s", job_id, result, feedback, msg)


def check_patch(job):
    jobobj = json.loads(job["jobpayload"])
    patch_id = jobobj["patch"]
    with NamedTemporaryFile() as f:
        api.patch_get_file_curl(patch_id, f.name)
        res = subprocess.check_output(["file", f.name])
        if "Zstandard compressed data" not in res.decode():
            msg = "Your file is not zstd compressed data"
            send_result(job["id"], "Failed", msg, msg)
            return
        proc = subprocess.run(
            f"cat {f.name} | zstd -d | docker load",
            shell=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        if proc.returncode != 0:
            feedback = "It is not a docker image after decompression."
            msg = "Docker error: " + proc.stderr.decode()
            send_result(job["id"], "Failed", feedback, msg)
            return
        nametag = proc.stdout.decode().strip().split(": ", 1)[1]
        logger.info("Loaded image %r for job %s", nametag, job["id"])
        proc = subprocess.run(
            ["docker", "rmi", nametag],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        if proc.returncode != 0:
            logger.warning("Failed to remove image %r", nametag)
        else:
            logger.info("Removed image %r for job %s", nametag, job["id"])

        if nametag != "hahamut:latest":
            msg = f"Image name is {nametag}, but it should be hahamut:latest"
            send_result(job["id"], "Failed", msg, msg)
        else:
            send_result(job["id"], "Success", "", "")


with connect_worker_api("check_patch", logger=logger) as api:
    team_ids = [t["id"] for t in api.teams_get()]
    for job in poll_jobs(api, team_ids, "CheckPatch"):
        logger.info("Job received: %s", job)
        try:
            check_patch(job)
        except:
            traceback.print_exc()
            msg = "Internal error: " + traceback.format_exc()
            feedback = "Internal error, please contact the staffs"
            send_result(job["id"], "Failed", feedback, msg)
