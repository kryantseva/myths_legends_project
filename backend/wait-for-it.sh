#!/usr/bin/env bash
# wait-for-it.sh

TIMEOUT=15
QUIET=0
WAITFORIT_HOST=
WAITFORIT_PORT=

echoerr() {
  if [ "$QUIET" -ne 1 ]; then echo "$@" 1>&2; fi
}

usage() {
  exit 1
}

while getopts "h:p:t:q" arg; do
  case $arg in
    h) WAITFORIT_HOST="${OPTARG}";;
    p) WAITFORIT_PORT="${OPTARG}";;
    t) TIMEOUT="${OPTARG}";;
    q) QUIET=1;;
    *) usage;;
  esac
done
shift $((OPTIND-1))

if [ -z "$WAITFORIT_HOST" ] || [ -z "$WAITFORIT_PORT" ]; then
  echoerr "Error: host (-h) and port (-p) are required."
  usage
fi

echoerr "Waiting for $WAITFORIT_HOST:$WAITFORIT_PORT..."
start_ts=$(date +%s)
while :
do
  if (( $(date +%s) - start_ts > TIMEOUT )) ; then
    echoerr "Timeout occurred after $TIMEOUT seconds waiting for $WAITFORIT_HOST:$WAITFORIT_PORT."
    exit 1
  fi
  (echo > /dev/tcp/$WAITFORIT_HOST/$WAITFORIT_PORT) >/dev/null 2>&1
  result=$?
  if [ $result -eq 0 ]; then
    echoerr "$WAITFORIT_HOST:$WAITFORIT_PORT is available after $(( $(date +%s) - start_ts )) seconds."
    break
  fi
  sleep 1
done

exec "$@"