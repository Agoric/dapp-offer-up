#!/bin/bash

echo ENV_SETUP starting

# FIXME not used anywhere; restore these debug flags
export DEBUG="SwingSet:ls,SwingSet:vat"

export CHAINID=agoriclocal
shopt -s expand_aliases

alias agops="/usr/src/agoric-sdk/node_modules/.bin/agops"
if test -f "$HOME/.agoric/envs"; then
  source "$HOME/.agoric/envs"
fi

export binary=ag0
if [ -x "$(command -v "agd")" ]; then
  # Skip the agoric-sdk/bin/agd wrapper script to prevent it rebuilding sdk
  ln -fs /usr/src/agoric-sdk/golang/cosmos/build/agd /usr/local/bin/agd
  export binary=agd
fi
export GOV1ADDR=$($binary keys show gov1 -a --keyring-backend="test")
export GOV2ADDR=$($binary keys show gov2 -a --keyring-backend="test")
export GOV3ADDR=$($binary keys show gov3 -a --keyring-backend="test")
export VALIDATORADDR=$($binary keys show validator -a --keyring-backend="test")
export USER1ADDR=$($binary keys show user1 -a --keyring-backend="test")

if [[ "$binary" == "agd" ]]; then
  configdir=/usr/src/agoric-sdk/packages/vm-config
  # Check specifically for package.json because the directory may persist in the file system
  # across branch changes due to gitignored node_modules
  test -f "$configdir/package.json" || configdir=/usr/src/agoric-sdk/packages/vats
  # Support testnet addresses
  sed -i "s/agoric1ldmtatp24qlllgxmrsjzcpe20fvlkp448zcuce/$GOV1ADDR/g" "$configdir"/*.json
  sed -i "s/agoric140dmkrz2e42ergjj7gyvejhzmjzurvqeq82ang/$GOV2ADDR/g" "$configdir"/*.json
  sed -i "s/agoric1w8wktaur4zf8qmmtn3n7x3r0jhsjkjntcm3u6h/$GOV3ADDR/g" "$configdir"/*.json

  # Support mainnet addresses
  sed -i "s/agoric1gx9uu7y6c90rqruhesae2t7c2vlw4uyyxlqxrx/$GOV1ADDR/g" "$configdir"/*.json
  sed -i "s/agoric1d4228cvelf8tj65f4h7n2td90sscavln2283h5/$GOV2ADDR/g" "$configdir"/*.json
  sed -i "s/agoric1zayxg4e9vd0es9c9jlpt36qtth255txjp6a8yc/$GOV3ADDR/g" "$configdir"/*.json
  sed -i '/agoric14543m33dr28x7qhwc558hzlj9szwhzwzpcmw6a/d' "$configdir"/*.json
  sed -i '/agoric13p9adwk0na5npfq64g22l6xucvqdmu3xqe70wq/d' "$configdir"/*.json
  sed -i '/agoric1el6zqs8ggctj5vwyukyk4fh50wcpdpwgugd5l5/d' "$configdir"/*.json

  # change names to gov1/2/3 since order is significant for invitation sending
  sed -i "s/Jason Potts/gov1/g" "$configdir"/*.json
  sed -i "s/Chloe White/gov2/g" "$configdir"/*.json
  sed -i "s/Joe Clark/gov3/g" "$configdir"/*.json

  # Oracle Addresses
  sed -i "s/agoric1krunjcqfrf7la48zrvdfeeqtls5r00ep68mzkr/$GOV1ADDR/g" "$configdir"/*.json
  sed -i "s/agoric1n4fcxsnkxe4gj6e24naec99hzmc4pjfdccy5nj/$GOV2ADDR/g" "$configdir"/*.json
  sed -i '/agoric19uscwxdac6cf6z7d5e26e0jm0lgwstc47cpll8/d' "$configdir"/*.json
  sed -i '/agoric144rrhh4m09mh7aaffhm6xy223ym76gve2x7y78/d' "$configdir"/*.json
  sed -i '/agoric19d6gnr9fyp6hev4tlrg87zjrzsd5gzr5qlfq2p/d' "$configdir"/*.json

  # committeeSize
  sed -i 's/committeeSize": 6/committeeSize": 3/g' "$configdir"/*.json
  sed -i 's/minSubmissionCount": 3/minSubmissionCount": 1/g' "$configdir"/*.json
fi

# XXX race conditions between build stages
await_agd_startable() {
  local retries="$1"

  local wait="10s"

  if agd status >/dev/null 2>&1; then
    # agd is running
    if [[ $retries -gt 0 ]]; then
      echo "Waiting $wait for agd to stop"
      sleep $wait

      await_agd_startable $((retries - 1))
    else
      echo "Cannot start agd because it's already running"
      return 1
    fi
  fi
}

startAgd() {
  echo "startAgd()"

  # precondition check
  await_agd_startable 10

  agd start --log_level warn "$@" &
  AGD_PID=$!
  echo $AGD_PID >$HOME/.agoric/agd.pid
  wait_for_bootstrap
  echo "Bootstrap reached, wait two more blocks for race conditions to settle"
  waitForBlock 2
  echo "startAgd() done"
}

killAgd() {
  echo "killAgd()"
  AGD_PID=$(cat $HOME/.agoric/agd.pid)
  kill $AGD_PID
  rm $HOME/.agoric/agd.pid
  # cf. https://stackoverflow.com/a/41613532
  tail --pid=$AGD_PID -f /dev/null || true
}

provisionSmartWallet() {
  addr="$1"
  amount="$2"
  echo "funding $addr"
  # shellcheck disable=SC2086
  agd tx bank send "validator" "$addr" "$amount" $SIGN_BROADCAST_OPTS -b block
  waitForBlock
  echo "provisioning $addr"
  # shellcheck disable=SC2086
  agd tx swingset provision-one my-wallet "$addr" SMART_WALLET --from="$addr" $SIGN_BROADCAST_OPTS -b block
  echo "Waiting for wallet $addr to reach vstorage"
  waitForBlock 5
  echo "Reading $addr from vstorage"
  agoric wallet show --from "$addr"
}

# XXX designed for ag0, others start well above height 1
wait_for_bootstrap() {
  echo "waiting for bootstrap..."
  endpoint="localhost"
  while true; do
    if json=$(curl -s --fail -m 15 "$endpoint:26657/status"); then
      if [[ "$(echo "$json" | jq -r .jsonrpc)" == "2.0" ]]; then
        # XXX the waitForBlock() function depends on this exact output
        if last_height=$(echo "$json" | jq -r .result.sync_info.latest_block_height); then
          if [[ "$last_height" != "1" ]]; then
            echo "$last_height"
            return
          else
            echo "$last_height"
          fi
        fi
      fi
    fi
    sleep 2
  done
  echo "done"
}

waitForBlock() (
  echo "waiting for block..."
  times=${1:-1}
  echo "$times"
  for ((i = 1; i <= times; i++)); do
    b1=$(wait_for_bootstrap)
    while true; do
      b2=$(wait_for_bootstrap)
      if [[ "$b1" != "$b2" ]]; then
        echo "block produced"
        break
      fi
      sleep 1
    done
  done
  echo "done"
)

fail() {
  echo "FAIL: $1"
  exit 1
}

success() {
  echo "SUCCESS: $1"
}

test_val() {
  want="$2"
  got="$1"
  testname="${3:-unnamedtest}"
  if [[ "$want" != "$got" ]]; then
    fail "TEST: $testname: wanted $want, got $got"
  else
    success "TEST: $testname: wanted $want, got $got"
  fi
}

test_not_val() {
  want="$2"
  got="$1"
  testname="${3:-unnamedtest}"
  if [[ "$want" == "$got" ]]; then
    fail "TEST: $testname:  $want is equal to $got"
  else
    success "TEST: $testname: $want is not equal to $got"
  fi
}

# gas=200000 is the default but gas used may be higher or lower. Setting it
# to "auto" makes the proposal executions less brittle.
GAS_ADJUSTMENT=1.2
export SIGN_BROADCAST_OPTS="--keyring-backend=test --chain-id=$CHAINID \
		--gas=auto --gas-adjustment=$GAS_ADJUSTMENT \
		--yes --broadcast-mode block --from validator"

voteLatestProposalAndWait() {
  echo "start voteLatestProposalAndWait()"
  waitForBlock
  proposal=$($binary q gov proposals -o json | jq -r '.proposals | last | if .proposal_id == null then .id else .proposal_id end')
  echo "Latest proposal: $proposal"
  waitForBlock
  # shellcheck disable=SC2086
  $binary tx gov deposit "$proposal" 50000000ubld $SIGN_BROADCAST_OPTS -b block
  waitForBlock
  # shellcheck disable=SC2086
  $binary tx gov vote "$proposal" yes $SIGN_BROADCAST_OPTS -b block
  waitForBlock

  echo "Voted in proposal $proposal"
  while true; do
    json=$($binary q gov proposal "$proposal" -ojson)
    status=$(echo "$json" | jq -r .status)
    case $status in
    PROPOSAL_STATUS_PASSED)
      break
      ;;
    PROPOSAL_STATUS_REJECTED | PROPOSAL_STATUS_FAILED)
      echo "Proposal did not pass (status=$status)"
      echo "$json" | jq .
      exit 1
      ;;
    *)
      echo "Waiting for proposal to pass (status=$status)"
      sleep 1
      ;;
    esac
  done
}

printKeys() {
  echo "========== GOVERNANCE KEYS =========="
  allaccounts=("gov1" "gov2" "gov3" "user1" "user2" "validator")
  for i in "${allaccounts[@]}"; do
    echo "---------- $i -----------"
    agd keys show --address --keyring-backend=test $i
    yes | agd keys export --unsafe --unarmored-hex --keyring-backend=test $i
    echo "---------- $i -----------"
  done
  echo "========== GOVERNANCE KEYS =========="
}

export USDC_DENOM="ibc/295548A78785A1007F232DE286149A6FF512F180AF5657780FC89C009E2C348F"
export ATOM_DENOM="ibc/BA313C4A19DFBF943586C0387E6B11286F9E416B4DD27574E6909CABE0E342FA"
export PSM_PAIR="IST.USDC_axl"

echo ENV_SETUP finished