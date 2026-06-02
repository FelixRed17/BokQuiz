#!/usr/bin/env bash
set -euo pipefail

# Install gems
bundle install

# API-only app: no asset pipeline tasks
# If you later add assets, re-enable:
# bundle exec rails assets:precompile
# bundle exec rails assets:clean


