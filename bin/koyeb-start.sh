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

bundle exec rails runner 'unless Question.exists?; load Rails.root.join("db","seeds.rb"); end'

bundle exec puma -C config/puma.rb

