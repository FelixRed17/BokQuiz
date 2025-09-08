class CreateGames < ActiveRecord::Migration[8.0]
  def change
    create_table :games do |t|
      t.string :code
      t.integer :status
      t.integer :round_number
      t.integer :current_question_index
      t.datetime :question_end_at
      t.string :host_token

      t.timestamps
    end
  end
end
