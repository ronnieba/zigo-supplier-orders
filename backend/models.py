from sqlalchemy import Column, String, Float, Integer, Date, DateTime, Boolean, ForeignKey, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from database import Base


def new_uuid():
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=new_uuid)
    username = Column(String, nullable=False, unique=True)   # login name
    full_name = Column(String, nullable=False)
    role = Column(String, nullable=False, default="viewer")  # admin / viewer
    password_hash = Column(String, nullable=False)
    active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, server_default=func.now())


class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(String, primary_key=True, default=new_uuid)
    name = Column(String, nullable=False)
    contact = Column(String)             # phone / general contact
    whatsapp = Column(String, nullable=True)
    email = Column(String, nullable=True)
    address = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    reminder_days = Column(String, nullable=True)   # JSON e.g. "[0,3]" where 0=Sun
    created_at = Column(DateTime, server_default=func.now())

    catalogs = relationship("Catalog", back_populates="supplier")
    products = relationship("Product", back_populates="supplier")
    orders = relationship("Order", back_populates="supplier")
    budget = relationship("SupplierBudget", back_populates="supplier", uselist=False)
    templates = relationship("OrderTemplate", back_populates="supplier")


class Catalog(Base):
    __tablename__ = "catalogs"

    id = Column(String, primary_key=True, default=new_uuid)
    supplier_id = Column(String, ForeignKey("suppliers.id"), nullable=False)
    file_path = Column(String)
    filename = Column(String)
    uploaded_at = Column(DateTime, server_default=func.now())
    parsed = Column(Boolean, default=False)
    products_count = Column(Integer, default=0)
    archived = Column(Boolean, default=False)

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
    template_items = relationship("OrderTemplateItem", back_populates="product")
    inventory = relationship("Inventory", back_populates="product", uselist=False)

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


class SupplierBudget(Base):
    __tablename__ = "supplier_budgets"

    id = Column(String, primary_key=True, default=new_uuid)
    supplier_id = Column(String, ForeignKey("suppliers.id"), nullable=False, unique=True)
    weekly_budget = Column(Float, nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    supplier = relationship("Supplier", back_populates="budget")


class OrderTemplate(Base):
    __tablename__ = "order_templates"

    id = Column(String, primary_key=True, default=new_uuid)
    supplier_id = Column(String, ForeignKey("suppliers.id"), nullable=False)
    name = Column(String, nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    supplier = relationship("Supplier", back_populates="templates")
    items = relationship("OrderTemplateItem", back_populates="template", cascade="all, delete-orphan")


class OrderTemplateItem(Base):
    __tablename__ = "order_template_items"

    id = Column(String, primary_key=True, default=new_uuid)
    template_id = Column(String, ForeignKey("order_templates.id"), nullable=False)
    product_id = Column(String, ForeignKey("products.id"), nullable=False)
    quantity = Column(Float, nullable=False)

    template = relationship("OrderTemplate", back_populates="items")
    product = relationship("Product", back_populates="template_items")


class Inventory(Base):
    __tablename__ = "inventory"
    id = Column(String, primary_key=True, default=new_uuid)
    product_id = Column(String, ForeignKey("products.id"), nullable=False, unique=True)
    current_qty = Column(Float, default=0)
    min_qty = Column(Float, default=0)
    unit = Column(String)
    notes = Column(Text)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    product = relationship("Product", back_populates="inventory")
