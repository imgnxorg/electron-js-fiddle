# Clear yarn cache
yarn cache clean

# Remove existing dependencies
rm -rf node_modules
rm yarn.lock

# Reinstall everything
yarn install

# Run linting
yarn lint
