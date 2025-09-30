class CreateGames < ActiveRecord::Migration[7.1]
  def change
    create_table :games, id: false do |t|
      t.primary_key :id
      t.string  :code,                  null: false
      t.integer :status,                null: false, default: 0   # 0:lobby,1:in_round,2:between_rounds,3:sudden_death,4:finished
      t.integer :round_number,          null: false, default: 1
      t.integer :current_question_index, null: false, default: 0
      t.datetime :question_end_at
      t.string :host_token,            null: false

      t.timestamps
    end

    add_index :games, :code,       unique: true
    add_index :games, :host_token, unique: true
  end
end
