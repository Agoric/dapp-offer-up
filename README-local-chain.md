# Agoric Local Chain with docker-compose

To start a local agoric blockchain:

```sh
docker compose up -d
```

**NOTE**: The image, which is several Gb, has to be pulled
and extracted the first time you start the docker application
services.

Then use `docker-compose logs` etc. as usual.

Some useful recipies are included in `Makefile`.
Use `yarn make:help` to list them.
For example: `yarn docker:make mint4k`.

See also https://github.com/Agoric/documentation/pull/881

See also the [Agoric Gov Proposal Builder](https://cosgov.org/).
