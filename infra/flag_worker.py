import logging

logging.basicConfig()
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

from api import connect_worker_api, WorkerApi
import json, time, logging, signal, os, requests, re, random


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


def handle_flag_update(job):
    payload = json.loads(job["jobpayload"])
    with open("../service/flag", "w") as f:
        f.write(payload["flag"])
    api.job_result(job["id"], "Success")
    logger.info("Updated flag for team %s to %s", job["team_id"], payload["flag"])


gamebox_id = get_gamebox_id()
logger.info(f"gamebox_id: {gamebox_id}")

with connect_worker_api(f"flag_{gamebox_id}", logger=logger) as api:
    # team_ids = [t["id"] for t in api.teams_get()]  # THIS IS ONLY FOR DEVELOPMENT, MUST BE REMOVED IN PRODUCTION
    team_ids = [gamebox_id]
    for job in poll_jobs(api, team_ids, "FlagUpdate"):
        logger.info("Job received: %s", job)
        if job["team_id"] == gamebox_id:
            handle_flag_update(job)
        # else:  # THIS IS ONLY FOR DEVELOPMENT, MUST BE REMOVED IN PRODUCTION
        #     api.job_result(job["id"], "Success")
