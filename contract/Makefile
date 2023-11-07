CHAINID=agoriclocal
USER1ADDR=$(shell agd keys show user1 -a --keyring-backend="test")
ACCT_ADDR=$(USER1ADDR)
BLD=000000ubld

.PHONY: list
# https://stackoverflow.com/a/73159833/7963
list:
	make -npq : 2> /dev/null | \
		awk -v RS= -F: '$$1 ~ /^[^#%]+$$/ { print $$1 }'

balance-q:
	agd keys show user1 -a --keyring-backend="test"
	agd query bank balances $(ACCT_ADDR)

GAS_ADJUSTMENT=1.2
SIGN_BROADCAST_OPTS=--keyring-backend=test --chain-id=$(CHAINID) \
		--gas=auto --gas-adjustment=$(GAS_ADJUSTMENT) \
		--yes -b block

mint4k:
	make FUNDS=1000$(ATOM) fund-acct
	agops vaults open --wantMinted 4000 --giveCollateral 1000 >/tmp/want4k.json
	agops perf satisfaction --executeOffer /tmp/want4k.json --from user1 --keyring-backend=test

FUNDS=321$(BLD)
fund-acct:
	agd tx bank send validator $(ACCT_ADDR) $(FUNDS) \
	  $(SIGN_BROADCAST_OPTS) \
	  -o json >,tx.json
	jq '{code: .code, height: .height}' ,tx.json

gov-q:
	agd query gov proposals --output json | \
		jq -c '.proposals[] | [.proposal_id,.voting_end_time,.status]'

PROPOSAL=1
VOTE_OPTION=yes
vote:
	agd tx gov vote $(PROPOSAL) $(VOTE_OPTION) --from=validator \
	  $(SIGN_BROADCAST_OPTS) \
	  -o json >,tx.json
	jq '{code: .code, height: .height}' ,tx.json

instance-q:
	agd query vstorage data published.agoricNames.instance -o json
