#!/usr/bin/env bash
set -euo pipefail

# Run DB migrations on boot (free plan workaround for no shell/preDeploy)
bundle exec rails db:migrate

# Seed questions once if none exist
bundle exec rails runner 'unless Question.exists?; load Rails.root.join("db","seeds.rb"); end'

# Start the app server
bundle exec puma -C config/puma.rb


