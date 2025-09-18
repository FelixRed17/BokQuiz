#!/usr/bin/env ruby
# Complete end-to-end game test simulation

puts "=== 🎮 COMPLETE GAME DAY TEST ==="
puts "Starting from scratch - creating game, players, and testing full flow..."

# Step 1: Create a fresh game
puts "\n1. 🏁 Creating new game..."
game = Game.create!
host = game.players.create!(name: "Quiz Master", is_host: true)
puts "✅ Game created: #{game.code}"

# Step 2: Add 4 players
puts "\n2. 👥 Adding players..."
player_names = ["Alice", "Bob", "Charlie", "Diana"]
players = []
player_names.each_with_index do |name, index|
  player = game.players.create!(name: name, is_host: false)
  players << player
  puts "✅ Added: #{name} (ID: #{player.id})"
end

# Step 3: Mark all players as ready
puts "\n3. ✅ Marking players as ready..."
players.each { |p| p.update!(ready: true) if p.respond_to?(:ready) }

# Step 4: Start the game
puts "\n4. 🚀 Starting game..."
game.update!(status: :in_round, round_number: 1, current_question_index: 0)
puts "✅ Game started - Round 1, Question 0"

# Step 5: Simulate Round 1 with a TIE scenario
puts "\n5. 📝 Simulating Round 1 with TIE scenario..."
round1_questions = Question.where(round_number: 1).order(:id)
puts "   Round 1 has #{round1_questions.count} questions"

round1_questions.each do |question|
  players.each_with_index do |player, index|
    # Create a tie: Alice and Bob get 0 points, Charlie and Diana get some points
    if ["Alice", "Bob"].include?(player.name)
      # Wrong answers for Alice and Bob (creates tie)
      wrong_index = question.correct_index == 0 ? 1 : 0
      Submission.create!(
        game: game, player: player, question: question,
        selected_index: wrong_index, submitted_at: Time.current,
        latency_ms: rand(2000..5000), correct: false
      )
    else
      # Correct answers for Charlie and Diana
      Submission.create!(
        game: game, player: player, question: question,
        selected_index: question.correct_index, submitted_at: Time.current,
        latency_ms: rand(1000..3000), correct: true
      )
    end
  end
end

# Step 6: End Round 1
puts "\n6. 🏁 Ending Round 1..."
game.update!(status: :between_rounds, question_end_at: nil, current_question_index: 4)

# Calculate and display scores
puts "\n📊 Round 1 Scores:"
players.each do |player|
  score = Submission.where(game: game, player: player, question: round1_questions)
                   .where(correct: true)
                   .joins(:question)
                   .sum("questions.points")
  puts "   #{player.name}: #{score} points"
end

puts "\n🔥 TIE DETECTED: Alice and Bob both have 0 points"
puts "   This will trigger SUDDEN DEATH!"

# Step 7: Display all tokens for Postman
puts "\n=== 🔑 ALL TOKENS FOR POSTMAN ==="
puts "game_code: #{game.code}"
puts "host_token: #{game.host_token}"
puts "host_reconnect_token: #{host.reconnect_token}"
puts ""
players.each_with_index do |player, index|
  puts "player#{index + 1}_token: #{player.reconnect_token}"
end

puts "\n=== 🧪 TESTING INSTRUCTIONS ==="
puts "1. Update Postman environment with the tokens above"
puts "2. Test the following sequence:"
puts ""
puts "   Step 1: GET /games/#{game.code}/state"
puts "   Expected: between_rounds, round 1, 4 active players"
puts ""
puts "   Step 2: GET /games/#{game.code}/round_result"
puts "   Expected: Should trigger sudden death (tie detected)"
puts ""
puts "   Step 3: GET /games/#{game.code}/state"
puts "   Expected: sudden_death, round 4, index 0"
puts ""
puts "   Step 4: GET /games/#{game.code}/question"
puts "   Expected: Sudden death question from round 4"
puts ""
puts "   Step 5: POST /games/#{game.code}/sudden_death_resolve"
puts "   Headers: X-Host-Token: #{game.host_token}"
puts "   Expected: Eliminate one player, advance to round 2"
puts ""
puts "   Step 6: GET /games/#{game.code}/state"
puts "   Expected: between_rounds, round 2, index 0"
puts ""
puts "🎮 This simulates a real game day with actual player interactions!"
puts "✅ Ready for testing!"
