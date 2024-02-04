import logging

logging.basicConfig()
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

from api import connect_worker_api, WorkerApi
import json, time, logging, signal, os, requests, re, subprocess, traceback, random
from tempfile import NamedTemporaryFile
from uuid import uuid4


def handle_interrupt(*args, **kwargs):
    exit()


signal.signal(signal.SIGINT, handle_interrupt)
signal.signal(signal.SIGTERM, handle_interrupt)


def get_gamebox_id():
    try:
        tags = requests.get(
            "http://169.254.169.254/computeMetadata/v1/instance/tags",
            headers={"Metadata-Flavor": "Google"},
            timeout=1,
        ).json()
        for tag in tags:
            m = re.match(r"^gamebox-team(\d+)", tag)
            if m:
                return int(m.group(1))
    except requests.exceptions.Timeout:
        return 10  # not on GCP vm, return the id of NPC team


def poll_jobs(api: WorkerApi, team_ids, *jobtypes, interval=5):
    while True:
        for jt in jobtypes:
            jobs = api.job_take_retry(jt, team_ids)
            random.shuffle(jobs)
            for j in jobs:
                yield j
            time.sleep(interval)


def handle_patch(job):
    jobobj = json.loads(job["jobpayload"])
    patch_id = jobobj["patch"]
    with NamedTemporaryFile() as f:
        api.patch_get_file_curl(patch_id, f.name)
        proc = subprocess.run(
            f"cat {f.name} | zstd -d | docker load",
            shell=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        logger.info(
            "docker load: job=%s, rc=%s, stdout=%r, stderr=%r",
            job["id"],
            proc.returncode,
            proc.stdout,
            proc.stderr,
        )
        if proc.returncode != 0:
            # api.job_result(job["id"], "Failed")
            api.job_result(
                job["id"],
                "Success",
                json.dumps(
                    {
                        "reason": "Unexpected error, either zstd decompression error or docker load error"
                    }
                ),
            )
            return
        with open("../service/.env", "w") as f:
            pwd = uuid4().hex
            f.write(f"ADMIN_PASSWORD={pwd}\n")
        proc = subprocess.run(
            "docker compose down",
            shell=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            cwd="../service",
        )
        logger.info(
            "docker compose down: job=%s, rc=%s, stdout=%r, stderr=%r",
            job["id"],
            proc.returncode,
            proc.stdout,
            proc.stderr,
        )
        if proc.returncode != 0:
            # api.job_result(job["id"], "Failed")
            api.job_result(
                job["id"],
                "Success",
                json.dumps({"reason": "Unexpected error, docker compose down failed"}),
            )
            return
        with open("../service/db.sqlite", "w") as f:
            f.write("")
        proc = subprocess.run(
            "docker compose up -d",
            shell=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            cwd="../service",
        )
        logger.info(
            "docker compose up: job=%s, rc=%s, stdout=%r, stderr=%r",
            job["id"],
            proc.returncode,
            proc.stdout,
            proc.stderr,
        )
        if proc.returncode != 0:
            # api.job_result(job["id"], "Failed")
            api.job_result(
                job["id"],
                "Success",
                json.dumps({"reason": "Unexpected error, docker compose up failed"}),
            )
            return
        api.job_result(job["id"], "Success")
        logger.info(
            "Successfully deployed patch %s for team %s", patch_id, job["team_id"]
        )


gamebox_id = get_gamebox_id()
logger.info(f"gamebox_id: {gamebox_id}")

with connect_worker_api(f"patch_{gamebox_id}", logger=logger) as api:
    # team_ids = [t["id"] for t in api.teams_get()]  # THIS IS ONLY FOR DEVELOPMENT, MUST BE REMOVED IN PRODUCTION
    team_ids = [gamebox_id]
    for job in poll_jobs(api, team_ids, "Patch"):
        logger.info("Job received: %s", job)
        if job["team_id"] == gamebox_id:
            try:
                handle_patch(job)
            except:
                traceback.print_exc()
                # api.job_result(job["id"], "Failed")
                api.job_result(
                    job["id"],
                    "Success",
                    json.dumps(
                        {
                            "reason": "Exception thrown from handle_patch: "
                            + traceback.format_exc()
                        }
                    ),
                )
        # else:  # THIS IS ONLY FOR DEVELOPMENT, MUST BE REMOVED IN PRODUCTION
        #     api.job_result(job["id"], "Success")
