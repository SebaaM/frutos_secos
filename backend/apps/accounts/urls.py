from django.urls import path
from .views import CustomerLogoutView, RequestLinkView, SessionView, StaffLoginView, StaffLogoutView, VerifyLinkView

urlpatterns = [
    path("session/", SessionView.as_view()),
    path("staff/login/", StaffLoginView.as_view()),
    path("staff/logout/", StaffLogoutView.as_view()),
    path("customer/request-link/", RequestLinkView.as_view()),
    path("customer/verify/", VerifyLinkView.as_view()),
    path("customer/logout/", CustomerLogoutView.as_view()),
]
