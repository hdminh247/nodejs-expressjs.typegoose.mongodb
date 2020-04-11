FROM mongo

# Create app directory
WORKDIR /usr/src/app

# Exceute command
COPY ./scripts .
