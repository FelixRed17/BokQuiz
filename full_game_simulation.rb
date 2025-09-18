#!/usr/bin/env ruby
# Full game simulation with multiple rounds and scenarios

puts "=== 🎮 FULL GAME SIMULATION ==="
puts "Simulating complete quiz game with realistic scenarios..."

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

# Round 1: Create a tie scenario
round1_questions = Question.where(round_number: 1).order(:id)
round1_questions.each do |question|
  players.each_with_index do |player, index|
    # Create a tie: Alice and Bob get 0 points, Charlie and Diana get some points
    if ["Alice", "Bob"].include?(player.name)
      # Wrong answers for Alice and Bob
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

puts "📊 Round 1 Results:"
players.each do |player|
  score = Submission.where(game: game, player: player, question: round1_questions)
                   .where(correct: true)
                   .joins(:question)
                   .sum("questions.points")
  puts "   #{player.name}: #{score} points"
end

puts "\n🔥 TIE DETECTED: Alice and Bob both have 0 points"
puts "   This will trigger SUDDEN DEATH!"

puts "\n=== 🎯 READY FOR TESTING ==="
puts "Game Code: #{game.code}"
puts "Host Token: #{game.host_token}"
puts "Status: #{game.status}"
puts "Round: #{game.round_number}"
puts ""
puts "🧪 Test Steps:"
puts "1. GET /games/#{game.code}/round_result (should trigger sudden death)"
puts "2. GET /games/#{game.code}/state (should show sudden_death, round 4)"
puts "3. POST /games/#{game.code}/sudden_death_resolve (eliminate one player)"
puts "4. GET /games/#{game.code}/state (should show between_rounds, round 2)"
puts ""
puts "🎮 This simulates a real game day scenario!"
