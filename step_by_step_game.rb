#!/usr/bin/env ruby
# Step-by-step game flow from Round 1 to Round 3 with one tie

puts "=== 🎮 STEP-BY-STEP GAME FLOW ==="
puts "Round 1 → Round 2 → Round 3 with one tie scenario"

# Create fresh game
game = Game.create!
host = game.players.create!(name: "Quiz Master", is_host: true)
players = ["Alice", "Bob", "Charlie", "Diana"].map do |name|
  game.players.create!(name: name, is_host: false)
end

puts "✅ Game created: #{game.code}"
puts "✅ Players: #{players.map(&:name).join(', ')}"

# Mark ready and start
players.each { |p| p.update!(ready: true) if p.respond_to?(:ready) }
game.update!(status: :in_round, round_number: 1, current_question_index: 0)

puts "\n🚀 Starting Round 1..."

# ROUND 1: Create a tie scenario (Alice and Bob tied with 0 points)
round1_questions = Question.where(round_number: 1).order(:id)
round1_questions.each do |question|
  players.each_with_index do |player, index|
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

# End Round 1
game.update!(status: :between_rounds, question_end_at: nil, current_question_index: 4)

puts "📊 Round 1 Scores:"
players.each do |player|
  score = Submission.where(game: game, player: player, question: round1_questions)
                   .where(correct: true)
                   .joins(:question)
                   .sum("questions.points")
  puts "   #{player.name}: #{score} points"
end

puts "\n🔥 TIE DETECTED: Alice and Bob both have 0 points"
puts "   This will trigger SUDDEN DEATH in Round 1!"

puts "\n=== 🧪 TESTING INSTRUCTIONS ==="
puts "Game Code: #{game.code}"
puts "Host Token: #{game.host_token}"
puts "Status: #{game.status}"
puts "Round: #{game.round_number}"
puts ""
puts "STEP 1: Test Round 1 Results (Should trigger sudden death)"
puts "GET /games/#{game.code}/round_result"
puts ""
puts "STEP 2: Check Sudden Death State"
puts "GET /games/#{game.code}/state"
puts "Expected: sudden_death, round 4, index 0"
puts ""
puts "STEP 3: Resolve Sudden Death"
puts "POST /games/#{game.code}/sudden_death_resolve"
puts "Headers: X-Host-Token: #{game.host_token}"
puts "Expected: Eliminate one player, advance to round 2"
puts ""
puts "STEP 4: Check Round 2 State"
puts "GET /games/#{game.code}/state"
puts "Expected: between_rounds, round 2, index 0"
puts ""
puts "STEP 5: Start Round 2"
puts "POST /games/#{game.code}/host_next"
puts "Headers: X-Host-Token: #{game.host_token}"
puts "Expected: Start Round 2, question 0"
puts ""
puts "STEP 6: Continue to Round 3"
puts "Complete Round 2 normally, then start Round 3"
puts ""
puts "🎮 This will test the complete flow: Round 1 → Sudden Death → Round 2 → Round 3"
