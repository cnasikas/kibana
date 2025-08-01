#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh

BUILDKITE_PARALLEL_JOB=${BUILDKITE_PARALLEL_JOB:-}
FTR_CONFIG_GROUP_KEY=${FTR_CONFIG_GROUP_KEY:-}
if [ "$FTR_CONFIG_GROUP_KEY" == "" ] && [ "$BUILDKITE_PARALLEL_JOB" == "" ]; then
  echo "Missing FTR_CONFIG_GROUP_KEY env var"
  exit 1
fi

EXTRA_ARGS=${FTR_EXTRA_ARGS:-}
test -z "$EXTRA_ARGS" || buildkite-agent meta-data set "ftr-extra-args" "$EXTRA_ARGS"

export JOB="$FTR_CONFIG_GROUP_KEY"

FAILED_CONFIGS_KEY="${BUILDKITE_STEP_ID}${FTR_CONFIG_GROUP_KEY}"

# a FTR failure will result in the script returning an exit code of 10
exitCode=0

configs="${FTR_CONFIG:-}"

# The first retry should only run the configs that failed in the previous attempt
# Any subsequent retries, which would generally only happen by someone clicking the button in the UI, will run everything
if [[ ! "$configs" && "${BUILDKITE_RETRY_COUNT:-0}" == "1" ]]; then
  configs=$(buildkite-agent meta-data get "$FAILED_CONFIGS_KEY" --default '')
  if [[ "$configs" ]]; then
    echo "--- Retrying only failed configs"
    echo "$configs"
  fi
fi

if [ "$configs" == "" ] && [ "$FTR_CONFIG_GROUP_KEY" != "" ]; then
  echo "--- downloading ftr test run order"
  download_artifact ftr_run_order.json .
  configs=$(jq -r '.[env.FTR_CONFIG_GROUP_KEY].names[]' ftr_run_order.json)
fi

if [ "$configs" == "" ]; then
  echo "unable to determine configs to run"
  exit 1
fi

failedConfigs=""
results=()

while read -r config; do
  if [[ ! "$config" ]]; then
    continue;
  fi

  FULL_COMMAND="node scripts/functional_tests --bail --config $config $EXTRA_ARGS"
  echo "--- $ $FULL_COMMAND"

  start=$(date +%s)

  if [[ "${USE_CHROME_BETA:-}" =~ ^(1|true)$ ]]; then
    echo "USE_CHROME_BETA was set - using google-chrome-beta"
    export TEST_BROWSER_BINARY_PATH="$(which google-chrome-beta)"

    # download the beta version of chromedriver
    export CHROMEDRIVER_VERSION=$(curl https://googlechromelabs.github.io/chrome-for-testing/last-known-good-versions.json -s | jq -r '.channels.Beta.version')
    export DETECT_CHROMEDRIVER_VERSION=false
    node node_modules/chromedriver/install.js --chromedriver-force-download

    # set annotation on the build
    buildkite-agent annotate --style info --context chrome-beta "This build uses Google Chrome Beta @ ${CHROMEDRIVER_VERSION}"
  fi

  # prevent non-zero exit code from breaking the loop
  set +e;
  node ./scripts/functional_tests \
    --bail \
    --kibana-install-dir "$KIBANA_BUILD_LOCATION" \
    --config="$config" \
    "$EXTRA_ARGS"
  lastCode=$?
  set -e;

  timeSec=$(($(date +%s)-start))
  if [[ $timeSec -gt 60 ]]; then
    min=$((timeSec/60))
    sec=$((timeSec-(min*60)))
    duration="${min}m ${sec}s"
  else
    duration="${timeSec}s"
  fi

  results+=("- $config
    duration: ${duration}
    result: ${lastCode}")

  if [ $lastCode -ne 0 ]; then
    exitCode=10
    echo "FTR exited with code $lastCode"
    echo "^^^ +++"

    if [[ "$failedConfigs" ]]; then
      failedConfigs="${failedConfigs}"$'\n'"$config"
    else
      failedConfigs="$config"
    fi
  fi
done <<< "$configs"

if [[ "$failedConfigs" ]]; then
  buildkite-agent meta-data set "$FAILED_CONFIGS_KEY" "$failedConfigs"
fi

echo "--- FTR configs complete"
printf "%s\n" "${results[@]}"
echo ""

# Scout reporter
echo "--- Upload Scout reporter events to AppEx QA's team cluster"
node scripts/scout upload-events --dontFailOnError

exit $exitCode
