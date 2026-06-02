# Configure CORS for React frontend on LAN/dev
# Configure CORS for React frontend on LAN/dev
Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    origins 'http://localhost:5173',
            'http://localhost:5174',
            'http://localhost:5175',
            'http://localhost:5176',
            'bok-quiz.vercel.app',
            %r{\Ahttp://127\.0\.0\.1:\d+},
            %r{\Ahttp://192\.168\.\d+\.\d+(?::\d+)?},
            %r{\Ahttp://10\.\d+\.\d+\.\d+(?::\d+)?},
            %r{\Ahttp://.*\.local(?::\d+)?},
            'https://excess-seana-felix-glucode-0704cdd3.koyeb.app'
    resource "/api/*", headers: :any, methods: [ :get, :post, :options ]
    resource "/cable", headers: :any, methods: [ :get, :post, :options ]
  end
end

# Be sure to restart your server when you modify this file.

# Avoid CORS issues when API is called from the frontend app.
# Handle Cross-Origin Resource Sharing (CORS) in order to accept cross-origin Ajax requests.

# Read more: https://github.com/cyu/rack-cors

# Rails.application.config.middleware.insert_before 0, Rack::Cors do
#   allow do
#     origins "example.com"
#
#     resource "*",
#       headers: :any,
#       methods: [:get, :post, :put, :patch, :delete, :options, :head]
#   end
# end


### Remove duplicate default block
