class AddUniqueIndexOnGamesAndPlayersId < ActiveRecord::Migration[8.0]
  disable_ddl_transaction!

  def change
    # Add unique index on games.id for Solid Cable
    add_index :games, :id, unique: true, algorithm: :concurrently, if_not_exists: true
    # Add unique index on players.id as well (you'll likely broadcast to players too)
    add_index :players, :id, unique: true, algorithm: :concurrently, if_not_exists: true
    # Add for other tables if you broadcast to them
    add_index :questions, :id, unique: true, algorithm: :concurrently, if_not_exists: true
    add_index :submissions, :id, unique: true, algorithm: :concurrently, if_not_exists: true
  end
end
