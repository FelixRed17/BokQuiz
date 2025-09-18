#!/usr/bin/env ruby
# Complete game day simulation with realistic player interactions

puts "=== 🎮 GAME DAY SIMULATION ==="
puts "Simulating a complete quiz game with 4 players..."

# Step 1: Create a fresh game
puts "\n1. 🏁 Creating new game..."
game = Game.create!
host = game.players.create!(name: "Quiz Master", is_host: true)
puts "✅ Game created: #{game.code}"

# Step 2: Add 4 players with realistic names
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

# Step 5: Simulate Round 1 with realistic answers
puts "\n5. 📝 Simulating Round 1..."
questions_round1 = Question.where(round_number: 1).order(:id)
puts "   Round 1 has #{questions_round1.count} questions"

questions_round1.each_with_index do |question, q_index|
  puts "   Question #{q_index + 1}: #{question.text[0..50]}..."
  
  # Simulate realistic player behavior
  players.each_with_index do |player, p_index|
    # Simulate different skill levels and response times
    skill_level = [0.7, 0.5, 0.8, 0.6][p_index] # Different accuracy rates
    response_time = rand(2000..8000) # 2-8 seconds
    
    if rand < skill_level
      # Correct answer
      selected_index = question.correct_index
      correct = true
      puts "     #{player.name}: ✅ Correct (#{response_time}ms)"
    else
      # Wrong answer
      wrong_options = (0...question.options.length).to_a - [question.correct_index]
      selected_index = wrong_options.sample
      correct = false
      puts "     #{player.name}: ❌ Wrong (#{response_time}ms)"
    end
    
    Submission.create!(
      game: game, player: player, question: question,
      selected_index: selected_index, submitted_at: Time.current,
      latency_ms: response_time, correct: correct
    )
  end
end

# Step 6: End Round 1 and check for ties
puts "\n6. 🏁 Ending Round 1..."
game.update!(status: :between_rounds, question_end_at: nil, current_question_index: 4)

# Calculate scores
puts "\n📊 Round 1 Scores:"
round1_questions = Question.where(round_number: 1)
players.each do |player|
  score = Submission.where(game: game, player: player, question: round1_questions)
                   .where(correct: true)
                   .joins(:question)
                   .sum("questions.points")
  puts "   #{player.name}: #{score} points"
end

# Check for ties
scores = players.map do |player|
  Submission.where(game: game, player: player, question: round1_questions)
            .where(correct: true)
            .joins(:question)
            .sum("questions.points")
end

min_score = scores.min
tied_players = players.select.with_index { |p, i| scores[i] == min_score }

if tied_players.length > 1
  puts "\n🔥 TIE DETECTED! Players with #{min_score} points:"
  tied_players.each { |p| puts "   - #{p.name}" }
  puts "   This would trigger SUDDEN DEATH!"
else
  puts "\n✅ No tie - normal elimination"
end

puts "\n=== 🎯 SIMULATION COMPLETE ==="
puts "Game Code: #{game.code}"
puts "Host Token: #{game.host_token}"
puts "Status: #{game.status}"
puts "Round: #{game.round_number}"
puts "Active Players: #{game.players.where(is_host: false, eliminated: false).count}"
puts ""
puts "🚀 Ready for real-time testing in Postman!"
puts "   Test the sudden death flow with the round_result endpoint"
