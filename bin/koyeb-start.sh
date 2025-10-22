#!/usr/bin/env bash
set -euo pipefail

# Ensure production by default on Koyeb
export RAILS_ENV="${RAILS_ENV:-production}"

# Run DB migrations (idempotent)
bundle exec rails db:migrate

if [ "${RESEED_QUESTIONS:-}" = "1" ]; then
  bundle exec rails runner 'RoundResult.delete_all; Submission.delete_all; Game.delete_all; Question.delete_all; load Rails.root.join("db","seeds.rb")'
fi

# Seed questions once if none exist
bundle exec rails runner 'unless Question.exists?; load Rails.root.join("db","seeds.rb"); end'

# Start the app server
bundle exec puma -C config/puma.rb


