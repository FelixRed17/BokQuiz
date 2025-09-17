class CreateSubmissions < ActiveRecord::Migration[7.1]
  def change
    create_table :submissions do |t|
      t.references :game,     null: false, foreign_key: true
      t.references :player,   null: false, foreign_key: true
      t.references :question, null: false, foreign_key: true

      t.integer  :selected_index, null: false
      t.boolean  :correct,        null: false, default: false
      t.datetime :submitted_at,   null: false
      t.integer  :latency_ms,     null: false, default: 0

      t.timestamps
    end

    add_index :submissions, [ :game_id, :player_id, :question_id ],
              unique: true, name: "uniq_submission_per_q"
  end
end
