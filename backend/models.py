from sqlalchemy import Column, String, Float, Integer, Date, DateTime, Boolean, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from database import Base


def new_uuid():
    return str(uuid.uuid4())


class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(String, primary_key=True, default=new_uuid)
    name = Column(String, nullable=False)
    contact = Column(String)
    created_at = Column(DateTime, server_default=func.now())

    catalogs = relationship("Catalog", back_populates="supplier")
    products = relationship("Product", back_populates="supplier")
    orders = relationship("Order", back_populates="supplier")


class Catalog(Base):
    __tablename__ = "catalogs"

    id = Column(String, primary_key=True, default=new_uuid)
    supplier_id = Column(String, ForeignKey("suppliers.id"), nullable=False)
    file_path = Column(String)
    filename = Column(String)
    uploaded_at = Column(DateTime, server_default=func.now())
    parsed = Column(Boolean, default=False)
    products_count = Column(Integer, default=0)

    supplier = relationship("Supplier", back_populates="catalogs")
    prices = relationship("ProductPrice", back_populates="catalog")


class Product(Base):
    __tablename__ = "products"

    id = Column(String, primary_key=True, default=new_uuid)
    supplier_id = Column(String, ForeignKey("suppliers.id"), nullable=False)
    code = Column(String)
    name = Column(String, nullable=False)
    category = Column(String)
    unit = Column(String)

    supplier = relationship("Supplier", back_populates="products")
    prices = relationship("ProductPrice", back_populates="product", order_by="ProductPrice.recorded_at")
    order_items = relationship("OrderItem", back_populates="product")

    @property
    def latest_price(self):
        if self.prices:
            return self.prices[-1].price
        return None


class ProductPrice(Base):
    __tablename__ = "product_prices"

    id = Column(String, primary_key=True, default=new_uuid)
    product_id = Column(String, ForeignKey("products.id"), nullable=False)
    catalog_id = Column(String, ForeignKey("catalogs.id"), nullable=False)
    price = Column(Float, nullable=False)
    recorded_at = Column(DateTime, server_default=func.now())

    product = relationship("Product", back_populates="prices")
    catalog = relationship("Catalog", back_populates="prices")


class Order(Base):
    __tablename__ = "orders"

    id = Column(String, primary_key=True, default=new_uuid)
    supplier_id = Column(String, ForeignKey("suppliers.id"), nullable=False)
    week_start = Column(String, nullable=False)   # ISO date string e.g. "2024-01-15"
    status = Column(String, default="draft")       # draft / confirmed
    notes = Column(Text)
    created_at = Column(DateTime, server_default=func.now())

    supplier = relationship("Supplier", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")

    @property
    def total_cost(self):
        return sum(item.total_price for item in self.items)


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(String, primary_key=True, default=new_uuid)
    order_id = Column(String, ForeignKey("orders.id"), nullable=False)
    product_id = Column(String, ForeignKey("products.id"), nullable=False)
    quantity = Column(Float, nullable=False)
    unit_price = Column(Float, nullable=False)

    order = relationship("Order", back_populates="items")
    product = relationship("Product", back_populates="order_items")

    @property
    def total_price(self):
        return round(self.quantity * self.unit_price, 2)
