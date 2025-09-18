#!/usr/bin/env ruby
# Complete test script for sudden death flow

puts "=== COMPLETE SUDDEN DEATH FLOW TEST ==="

# Step 1: Create a new game
puts "1. Creating new game..."
game = Game.create!
host = game.players.create!(name: "Host", is_host: true)
puts "Game created: #{game.code}"

# Step 2: Add 4 players
puts "2. Adding 4 players..."
players = []
4.times do |i|
  player = game.players.create!(name: "Player #{i+1}", is_host: false)
  players << player
  puts "Added: #{player.name} (ID: #{player.id})"
end

# Step 3: Mark all players as ready
puts "3. Marking players as ready..."
players.each do |player|
  player.update!(ready: true) if player.respond_to?(:ready)
end

# Step 4: Start the game
puts "4. Starting game..."
game.update!(status: :in_round, round_number: 1, current_question_index: 0)
puts "Game started - Round 1, Question 0"

# Step 5: Complete Round 1 with all wrong answers (to create a tie)
puts "5. Completing Round 1 with tied scores..."
questions = Question.where(round_number: 1).order(:id)
questions.each do |question|
  players.each do |player|
    wrong_index = question.correct_index == 0 ? 1 : 0
    Submission.create!(
      game: game, player: player, question: question,
      selected_index: wrong_index, submitted_at: Time.current,
      latency_ms: rand(1000..3000), correct: false
    )
  end
end

# Step 6: End Round 1
puts "6. Ending Round 1..."
game.update!(status: :between_rounds, question_end_at: nil, current_question_index: 4)

puts ""
puts "=== GAME READY FOR TESTING ==="
puts "Game Code: #{game.code}"
puts "Host Token: #{game.host_token}"
puts "Status: #{game.status}"
puts "Round: #{game.round_number}"
puts "Question Index: #{game.current_question_index}"
puts "Active Players: #{game.players.where(is_host: false, eliminated: false).count}"
puts ""
puts "Next steps in Postman:"
puts "1. GET /games/#{game.code}/round_result (should trigger sudden death)"
puts "2. GET /games/#{game.code}/state (should show sudden_death, round 4)"
puts "3. POST /games/#{game.code}/sudden_death_resolve (eliminate one player)"
puts "4. GET /games/#{game.code}/state (should show between_rounds, round 2)"
