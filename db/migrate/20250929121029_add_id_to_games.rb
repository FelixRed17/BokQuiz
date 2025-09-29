class AddIdToGames < ActiveRecord::Migration[8.0]
  def change
    # Only add if it doesn't exist
    unless column_exists?(:players, :id)
      add_column :players, :id, :primary_key
    end
  end
end
