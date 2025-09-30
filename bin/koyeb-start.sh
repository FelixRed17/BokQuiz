#!/usr/bin/env bash
set -euo pipefail

# Ensure production by default on Koyeb
export RAILS_ENV="${RAILS_ENV:-production}"

# Run DB migrations (idempotent)
bundle exec rails db:migrate

# Seed questions once if none exist
bundle exec rails runner 'unless Question.exists?; load Rails.root.join("db","seeds.rb"); end'

# Start the app server
bundle exec puma -C config/puma.rb


