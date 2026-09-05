from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    PaymentCategoryViewSet, PaymentViewSet, PaymentItemViewSet,
    ExpenseViewSet, ExpenseCategoryViewSet, DoctorSettlementViewSet, ChargeItemViewSet
)

router = DefaultRouter()
router.register(r'payment-categories', PaymentCategoryViewSet)
router.register(r'payments', PaymentViewSet)
router.register(r'payment-items', PaymentItemViewSet)
router.register(r'expenses', ExpenseViewSet)
router.register(r'expense-categories', ExpenseCategoryViewSet)
router.register(r'doctor-settlements', DoctorSettlementViewSet)
router.register(r'charge-items', ChargeItemViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
