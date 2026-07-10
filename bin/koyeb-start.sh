#!/usr/bin/env bash
set -euo pipefail

export RAILS_ENV="${RAILS_ENV:-production}"

bundle exec rails db:migrate

if [ "${RESEED_QUESTIONS:-}" = "1" ]; then
  bundle exec rails runner '
    ActiveRecord::Base.transaction do
      ActiveRecord::Base.connection.execute <<~SQL
        TRUNCATE TABLE round_results, submissions, players, games, questions
        RESTART IDENTITY CASCADE;
      SQL
      load Rails.root.join("db","seeds.rb")
    end
  '
fi

# Keep DB question text/options aligned with db/questions.yml on every deploy.
bundle exec rails db:seed

bundle exec puma -C config/puma.rb

