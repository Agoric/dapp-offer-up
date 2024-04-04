src=agoric1t83za2h5zc5anmkxvfag82qafshr538mvzmnmx
dest=agoric1p2aqakv3ulz4qfy2nut86j9gx0dx0yw09h96md
amt=5553530000uist

agd tx bank send $src $dest $amt --keyring-backend=test --chain-id=agoriclocal \
--gas=auto --gas-adjustment=1.2 --yes -b block