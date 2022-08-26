#!/bin/bash
ssh-keygen -t rsa -P "" -b 4096 -m PEM -f ./users-service/jwtRS256.key
ssh-keygen -e -m PEM -f ./users-service/jwtRS256.key > ./users-service/jwtRS256.key.pub
