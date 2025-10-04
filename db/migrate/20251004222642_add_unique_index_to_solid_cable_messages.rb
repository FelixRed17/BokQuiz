class AddUniqueIndexToSolidCableMessages < ActiveRecord::Migration[8.0]
  def change
    add_index :solid_cable_messages, :id, unique: true
  end
end
