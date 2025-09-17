#!/usr/bin/env bash
set -euo pipefail

# Install gems
bundle install

# Precompile assets (safe even for API-only; skips if no assets)
bundle exec rails assets:precompile

# Clean old assets to keep slug smaller
bundle exec rails assets:clean


