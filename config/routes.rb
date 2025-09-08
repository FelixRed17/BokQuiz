Rails.application.routes.draw do
  namespace :api do
    namespace :v1 do
      resources :games, only: [:create], param: :code do
        member do
          get  :state
          post :join
        end
      end
    end
  end

  # Action Cable (for realtime, later)
  mount ActionCable.server => '/cable'
end
