Rails.application.routes.draw do
  namespace :api do
    namespace :v1 do
      resources :games, only: [ :create ], param: :code do
        member do
          get  :state
          get  :question
          get  :me
          post :join
          post :rename
          post :ready
          post :host_start
          post :host_next
          post :host_finish
          post :submit
          get  :round_result
          get  :results
        end
      end
    end
  end

  mount ActionCable.server => "/cable"
end
