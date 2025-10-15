# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.0].define(version: 2025_10_15_145508) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  create_table "games", force: :cascade do |t|
    t.string "code", null: false
    t.integer "status", default: 0, null: false
    t.integer "round_number", default: 1, null: false
    t.integer "current_question_index", default: 0, null: false
    t.datetime "question_end_at"
    t.string "host_token", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.jsonb "sudden_death_player_ids", default: [], null: false
    t.integer "last_processed_round", default: 0, null: false
    t.integer "sd_offset", default: 0, null: false
    t.integer "sudden_death_attempts", default: 0, null: false
    t.datetime "sudden_death_started_at"
    t.index ["code"], name: "index_games_on_code", unique: true
    t.index ["host_token"], name: "index_games_on_host_token", unique: true
    t.index ["id"], name: "index_games_on_id", unique: true
    t.index ["last_processed_round"], name: "index_games_on_last_processed_round"
    t.index ["sd_offset"], name: "index_games_on_sd_offset"
  end

  create_table "players", force: :cascade do |t|
    t.bigint "game_id", null: false
    t.string "name", null: false
    t.boolean "is_host", default: false, null: false
    t.boolean "eliminated", default: false, null: false
    t.integer "total_score", default: 0, null: false
    t.string "reconnect_token", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.boolean "ready", default: false, null: false
    t.index ["game_id", "name"], name: "index_players_on_game_id_and_name", unique: true
    t.index ["game_id", "ready"], name: "index_players_on_game_id_and_ready"
    t.index ["game_id"], name: "index_players_on_game_id"
    t.index ["game_id"], name: "uniq_host_per_game", unique: true, where: "(is_host = true)"
    t.index ["id"], name: "index_players_on_id", unique: true
    t.index ["reconnect_token"], name: "index_players_on_reconnect_token", unique: true
  end

  create_table "questions", force: :cascade do |t|
    t.integer "round_number", null: false
    t.text "text", null: false
    t.jsonb "options", default: [], null: false
    t.integer "correct_index", null: false
    t.integer "points", default: 1, null: false
    t.integer "time_limit", default: 40, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["id"], name: "index_questions_on_id", unique: true
    t.index ["round_number"], name: "index_questions_on_round_number"
  end

  create_table "round_results", force: :cascade do |t|
    t.bigint "game_id", null: false
    t.integer "round_number", null: false
    t.jsonb "payload", default: {}, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["game_id", "round_number"], name: "index_round_results_on_game_and_round", unique: true
    t.index ["game_id"], name: "index_round_results_on_game_id"
  end

  create_table "solid_cable_messages", force: :cascade do |t|
    t.binary "channel", null: false
    t.binary "payload", null: false
    t.datetime "created_at", null: false
    t.bigint "channel_hash", null: false
    t.index ["channel"], name: "index_solid_cable_messages_on_channel"
    t.index ["channel_hash"], name: "index_solid_cable_messages_on_channel_hash"
    t.index ["created_at"], name: "index_solid_cable_messages_on_created_at"
  end

  create_table "submissions", force: :cascade do |t|
    t.bigint "game_id", null: false
    t.bigint "player_id", null: false
    t.bigint "question_id", null: false
    t.integer "selected_index", null: false
    t.boolean "correct", default: false, null: false
    t.datetime "submitted_at", null: false
    t.integer "latency_ms", default: 0, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["game_id", "player_id", "question_id"], name: "uniq_submission_per_q", unique: true
    t.index ["game_id"], name: "index_submissions_on_game_id"
    t.index ["id"], name: "index_submissions_on_id", unique: true
    t.index ["player_id"], name: "index_submissions_on_player_id"
    t.index ["question_id"], name: "index_submissions_on_question_id"
  end

  add_foreign_key "players", "games"
  add_foreign_key "round_results", "games"
  add_foreign_key "submissions", "games"
  add_foreign_key "submissions", "players"
  add_foreign_key "submissions", "questions"
end
