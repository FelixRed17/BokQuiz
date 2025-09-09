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

ActiveRecord::Schema[8.0].define(version: 2025_09_08_083307) do
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
    t.index ["code"], name: "index_games_on_code", unique: true
    t.index ["host_token"], name: "index_games_on_host_token", unique: true
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
    t.index ["game_id", "name"], name: "index_players_on_game_id_and_name", unique: true
    t.index ["game_id"], name: "index_players_on_game_id"
    t.index ["reconnect_token"], name: "index_players_on_reconnect_token", unique: true
  end

  create_table "questions", force: :cascade do |t|
    t.integer "round_number", null: false
    t.text "text", null: false
    t.jsonb "options", default: [], null: false
    t.integer "correct_index", null: false
    t.integer "points", default: 1, null: false
    t.integer "time_limit", default: 25, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["round_number"], name: "index_questions_on_round_number"
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
    t.index ["player_id"], name: "index_submissions_on_player_id"
    t.index ["question_id"], name: "index_submissions_on_question_id"
  end

  add_foreign_key "players", "games"
  add_foreign_key "submissions", "games"
  add_foreign_key "submissions", "players"
  add_foreign_key "submissions", "questions"
end
