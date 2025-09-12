class AddQuestionStartedAndSuddenDeathToGames < ActiveRecord::Migration[8.0]
  def change
    add_column :games, :question_started_at, :datetime
    add_column :games, :sudden_death_candidate_ids, :jsonb, null: false, default: []
    add_index :games, :sudden_death_candidate_ids, using: :gin

    # prevent duplicate submissions (one per player/question)
    add_index :submissions, [:game_id, :player_id, :question_id],
              unique: true, name: "index_unique_submission_per_player_question"
  end
end

# need to still run rails db:migrate because of the new migration
# rails db:migrate