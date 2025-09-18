#!/usr/bin/env ruby
# Get all tokens for testing

puts "=== ALL TOKENS FOR TESTING ==="

game = Game.last
puts "Game Code: #{game.code}"
puts "Host Token: #{game.host_token}"

host = game.players.find_by(is_host: true)
puts "Host Reconnect Token: #{host.reconnect_token}"
puts ""

puts "Player Tokens:"
game.players.where(is_host: false).each_with_index do |player, index|
  puts "Player #{index + 1} (#{player.name}): #{player.reconnect_token}"
end

puts ""
puts "=== POSTMAN ENVIRONMENT VARIABLES ==="
puts "game_code: #{game.code}"
puts "host_token: #{game.host_token}"
puts "host_reconnect_token: #{host.reconnect_token}"
puts "player1_token: #{game.players.where(is_host: false).first&.reconnect_token}"
puts "player2_token: #{game.players.where(is_host: false).second&.reconnect_token}"
puts "player3_token: #{game.players.where(is_host: false).third&.reconnect_token}"
puts "player4_token: #{game.players.where(is_host: false).fourth&.reconnect_token}"
