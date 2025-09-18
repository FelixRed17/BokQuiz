#!/usr/bin/env ruby
# Get all new tokens for the step-by-step game

puts "=== 🔑 NEW TOKENS FOR STEP-BY-STEP GAME ==="

game = Game.last
host = game.players.find_by(is_host: true)
players = game.players.where(is_host: false)

puts "Game Code: #{game.code}"
puts "Host Token: #{game.host_token}"
puts "Host Reconnect Token: #{host.reconnect_token}"
puts ""

puts "Player Tokens:"
players.each_with_index do |player, index|
  puts "Player #{index + 1} (#{player.name}): #{player.reconnect_token}"
end

puts ""
puts "=== 📋 POSTMAN ENVIRONMENT VARIABLES ==="
puts "game_code: #{game.code}"
puts "host_token: #{game.host_token}"
puts "host_reconnect_token: #{host.reconnect_token}"
puts "player1_token: #{players.first&.reconnect_token}"
puts "player2_token: #{players.second&.reconnect_token}"
puts "player3_token: #{players.third&.reconnect_token}"
puts "player4_token: #{players.fourth&.reconnect_token}"
puts "base_url: http://localhost:3000"

puts ""
puts "=== 🎯 CURRENT GAME STATE ==="
puts "Status: #{game.status}"
puts "Round: #{game.round_number}"
puts "Question Index: #{game.current_question_index}"
puts "Active Players: #{game.players.where(is_host: false, eliminated: false).count}"

puts ""
puts "✅ Copy these values to your Postman environment!"
puts "🎮 Ready to test the complete flow!"
