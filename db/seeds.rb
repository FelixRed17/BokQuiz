require "yaml"

Question.delete_all

yml_path = Rails.root.join("db", "questions.yml")
if File.exist?(yml_path)
  data = YAML.load_file(yml_path)
  data.fetch("rounds", []).each do |round|
    rn = round.fetch("number")
    round.fetch("questions").each do |q|
      Question.create!(
        round_number:  rn,
        text:          q.fetch("text"),
        options:       q.fetch("options"),
        correct_index: q.fetch("correct_index"),
        points:        q.fetch("points", 1),
        time_limit:    q.fetch("time_limit", 25)
      )
    end
  end
else
  puts "No db/questions.yml found. Seeding the updated quiz questions…"
  [
    { number: 1, questions: [
      { text: "Which country has won the FIFA World Cup the most times?", options: ["Germany", "Italy", "Argentina", "Brazil"], correct_index: 3, points: 1, time_limit: 20 },
      { text: "In which year did South Africa host the FIFA World Cup?", options: ["2006", "2010", "2014", "2002"], correct_index: 1, points: 1, time_limit: 20 },
      { text: "Which Bafana Bafana player scored South Africa’s first-ever FIFA World Cup goal in 1998?", options: ["Benni McCarthy", "Shaun Bartlett", "Lucas Radebe", "Philemon Masinga"], correct_index: 1, points: 1, time_limit: 20 },
      { text: "Which country defeated South Africa in the opening match of the 2010 FIFA World Cup?", options: ["Mexico", "Uruguay", "France", "Spain"], correct_index: 0, points: 1, time_limit: 20 },
      { text: "Who was the captain of Bafana Bafana during the 2010 FIFA World Cup?", options: ["Aaron Mokoena", "Lucas Radebe", "Steven Pienaar", "Benni McCarthy"], correct_index: 0, points: 1, time_limit: 20 }
    ] },
    { number: 2, questions: [
      { text: "Which nation won the 2018 FIFA World Cup?", options: ["Croatia", "Germany", "France", "Argentina"], correct_index: 2, points: 1, time_limit: 20 },
      { text: "Which South African player was famously nicknamed “Shoes”?", options: ["Doctor Khumalo", "Jomo Sono", "Shoes Moshoeu", "Teko Modise"], correct_index: 2, points: 1, time_limit: 20 },
      { text: "Which country hosted the FIFA World Cup in 1994?", options: ["Mexico", "Germany", "United States", "France"], correct_index: 2, points: 1, time_limit: 20 },
      { text: "Which African country reached the FIFA World Cup semi-finals first?", options: ["Nigeria", "Ghana", "Cameroon", "Morocco"], correct_index: 3, points: 1, time_limit: 20 },
      { text: "Who scored the iconic opening goal for South Africa against Mexico in the 2010 World Cup?", options: ["Katlego Mphela", "Siphiwe Tshabalala", "Steven Pienaar", "Bernard Parker"], correct_index: 1, points: 1, time_limit: 20 }
    ] },
    { number: 3, questions: [
      { text: "Which country won the very first FIFA World Cup in 1930?", options: ["Brazil", "Italy", "Uruguay", "Argentina"], correct_index: 2, points: 1, time_limit: 20 },
      { text: "Which Bafana Bafana legend played for Leeds United in England?", options: ["Benni McCarthy", "Lucas Radebe", "Shaun Bartlett", "Delron Buckley"], correct_index: 1, points: 1, time_limit: 20 },
      { text: "Which nation hosted the FIFA World Cup twice before 2026?", options: ["Qatar", "South Africa", "Brazil", "Russia"], correct_index: 2, points: 1, time_limit: 20 },
      { text: "Which player has scored the most goals in FIFA World Cup history?", options: ["Pelé", "Ronaldo Nazário", "Lionel Messi", "Miroslav Klose"], correct_index: 3, points: 1, time_limit: 20 },
      { text: "Which South African club did Benni McCarthy begin his professional career with?", options: ["Kaizer Chiefs", "Orlando Pirates", "Seven Stars", "Ajax Cape Town"], correct_index: 2, points: 1, time_limit: 20 }
    ] },
    { number: 4, questions: [
      { text: "Which country famously won the FIFA World Cup in 2022?", options: ["France", "Croatia", "Brazil", "Argentina"], correct_index: 3, points: 1, time_limit: 15 },
      { text: "Which South African player became famous for the phrase “Diski Dance” celebration?", options: ["Siphiwe Tshabalala", "Mark Fish", "Doctor Khumalo", "Siyabonga Nomvethe"], correct_index: 0, points: 1, time_limit: 15 },
      { text: "Which country hosted the FIFA World Cup immediately after South Africa?", options: ["Brazil", "Russia", "Germany", "Qatar"], correct_index: 0, points: 1, time_limit: 15 },
      { text: "Which African nation eliminated defending champions France in the 2002 FIFA World Cup?", options: ["Senegal", "Ghana", "Nigeria", "Cameroon"], correct_index: 0, points: 1, time_limit: 15 },
      { text: "What was the official slogan of the 2010 FIFA World Cup in South Africa?", options: ["Celebrate Humanity", "Africa United", "Ke Nako", "Feel the Beat"], correct_index: 2, points: 1, time_limit: 15 }
    ] },
    { number: 5, questions: [
      { text: "Sudden Death: Which city hosted the opening match of the 2010 FIFA World Cup?", options: ["Cape Town", "Durban", "Johannesburg", "Pretoria"], correct_index: 2, points: 1, time_limit: 15 },
      { text: "Sudden Death: Against which country did Bafana Bafana record their only victory at the 2010 FIFA World Cup?", options: ["France", "Mexico", "Uruguay", "Spain"], correct_index: 0, points: 1, time_limit: 15 },
      { text: "Sudden Death: Who was the head coach of Bafana Bafana during the 2010 FIFA World Cup?", options: ["Stuart Baxter", "Carlos Alberto Parreira", "Joel Santana", "Clive Barker"], correct_index: 1, points: 1, time_limit: 15 },
      { text: "Sudden Death: Which South African goalkeeper started all three matches at the 2010 FIFA World Cup?", options: ["Senzo Meyiwa", "Moeneeb Josephs", "Itumeleng Khune", "Rowen Fernandez"], correct_index: 2, points: 1, time_limit: 15 },
      { text: "Sudden Death: Which stadium hosted the 2010 FIFA World Cup Final?", options: ["Cape Town Stadium", "Moses Mabhida Stadium", "Soccer City (FNB Stadium)", "Ellis Park Stadium"], correct_index: 2, points: 1, time_limit: 15 },
      { text: "Sudden Death: Which South African player scored the winning goal against France at the 2010 FIFA World Cup?", options: ["Siphiwe Tshabalala", "Katlego Mphela", "Bongani Khumalo", "Steven Pienaar"], correct_index: 1, points: 1, time_limit: 15 },
      { text: "Sudden Death: Bafana Bafana failed to reach the Round of 16 in 2010 primarily because of:", options: ["Goal difference", "Fair play points", "Head-to-head record", "Penalty shootout"], correct_index: 0, points: 1, time_limit: 15 },
      { text: "Sudden Death: Which South African player captained Bafana Bafana when they won the 1996 Africa Cup of Nations?", options: ["Lucas Radebe", "Neil Tovey", "Doctor Khumalo", "Mark Fish"], correct_index: 1, points: 1, time_limit: 15 },
      { text: "Sudden Death: South Africa qualified for the 2002 FIFA World Cup under which coach?", options: ["Clive Barker", "Carlos Queiroz", "Jomo Sono", "Trott Moloto"], correct_index: 1, points: 1, time_limit: 15 },
      { text: "Sudden Death: Which country eliminated South Africa from the 2002 FIFA World Cup?", options: ["Paraguay", "Spain", "Slovenia", "Sweden"], correct_index: 1, points: 1, time_limit: 15 },
      { text: "Sudden Death: Which South African player scored against Spain at the 2002 FIFA World Cup?", options: ["Benni McCarthy", "Quinton Fortune", "Lucas Radebe", "Siyabonga Nomvethe"], correct_index: 1, points: 1, time_limit: 15 },
      { text: "Sudden Death: Before 2010, South Africa's first FIFA World Cup appearance came in:", options: ["1994", "1998", "2002", "2006"], correct_index: 1, points: 1, time_limit: 15 },
      { text: "Sudden Death: Which famous musical instrument became the symbol of the 2010 FIFA World Cup in South Africa?", options: ["Marimba", "Djembe", "Vuvuzela", "Mbira"], correct_index: 2, points: 1, time_limit: 15 },
      { text: "Sudden Death: Which South African referee officiated matches at both the 2010 and 2014 FIFA World Cups?", options: ["Victor Gomes", "Jerome Damon", "Daniel Bennett", "Ace Ngcobo"], correct_index: 1, points: 1, time_limit: 15 },
      { text: "Sudden Death: South Africa's first-ever FIFA World Cup point was earned against:", options: ["France", "Mexico", "Denmark", "Saudi Arabia"], correct_index: 1, points: 1, time_limit: 15 },
      { text: "Sudden Death: Which South African defender scored Bafana Bafana's second goal against France in 2010?", options: ["Bongani Khumalo", "Anele Ngcongca", "Aaron Mokoena", "Bryce Moon"], correct_index: 0, points: 1, time_limit: 15 },
      { text: "Sudden Death: Which city hosted the famous South Africa vs France match at the 2010 FIFA World Cup?", options: ["Durban", "Johannesburg", "Bloemfontein", "Port Elizabeth"], correct_index: 2, points: 1, time_limit: 15 },
      { text: "Sudden Death: Which South African player provided the assist for Siphiwe Tshabalala's famous goal against Mexico?", options: ["Steven Pienaar", "Katlego Mphela", "Teko Modise", "Kagisho Dikgacoi"], correct_index: 1, points: 1, time_limit: 15 },
      { text: "Sudden Death: Which South African was a member of FIFA's Executive Committee and played a key role in bringing the 2010 FIFA World Cup to Africa?", options: ["Patrice Motsepe", "Irvin Khoza", "Danny Jordaan", "Kaizer Motaung"], correct_index: 2, points: 1, time_limit: 15 },
      { text: "Sudden Death: Which South African city hosted the most matches during the 2010 FIFA World Cup?", options: ["Durban", "Cape Town", "Johannesburg", "Port Elizabeth"], correct_index: 2, points: 1, time_limit: 15 }
    ] }
  ].each do |round|
    rn = round[:number]
    round[:questions].each do |q|
      Question.create!(
        round_number: rn,
        text: q[:text],
        options: q[:options],
        correct_index: q[:correct_index],
        points: q[:points],
        time_limit: q[:time_limit]
      )
    end
  end
end

puts "Seeded #{Question.count} questions"

# This file should ensure the existence of records required to run the application in every environment (production,
# development, test). The code here should be idempotent so that it can be executed at any point in every environment.
# The data can then be loaded with the bin/rails db:seed command (or created alongside the database with db:setup).
#
# Example:
#
#   ["Action", "Comedy", "Drama", "Horror"].each do |genre_name|
#     MovieGenre.find_or_create_by!(name: genre_name)
#   end
