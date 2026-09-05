from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import StockViewSet, StockCategoryViewSet, StockTransactionViewSet

router = DefaultRouter()
router.register(r'stocks', StockViewSet)
router.register(r'stock-categories', StockCategoryViewSet)
router.register(r'stock-transactions', StockTransactionViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
