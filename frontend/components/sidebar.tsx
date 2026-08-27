'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

type MenuItem = {
  id: number;
  name: string;
  icon?: string;
  sort_order?: number;
};

type MenuSubItem = {
  id: number;
  name: string;
  menu: string;
  value?: string;
  link?: string;
  color?: string;
  sort_order?: number;
};

const Sidebar = () => {
  const pathname = usePathname();
  const { user } = useAuth();
  const [openMenus, setOpenMenus] = useState<{ [key: string]: boolean }>({});
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [menuSubs, setMenuSubs] = useState<MenuSubItem[]>([]);
  const [loading, setLoading] = useState(true);

  const role = user?.role;

  useEffect(() => {
    let isMounted = true;

    const fetchMenus = async () => {
      if (!user?.token) {
        if (isMounted) {
          setMenus([]);
          setMenuSubs([]);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      try {
        const params = role ? { role } : undefined;
        const [menuData, menuSubData] = await Promise.all([
          api.getAllMenus(user.token, params),
          api.getAllMenuSubs(user.token, params),
        ]);

        if (!isMounted) return;
        setMenus(Array.isArray(menuData) ? menuData : []);
        setMenuSubs(Array.isArray(menuSubData) ? menuSubData : []);
      } catch (error) {
        console.error('Failed to load menus:', error);
        if (isMounted) {
          setMenus([]);
          setMenuSubs([]);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchMenus();
    return () => {
      isMounted = false;
    };
  }, [role, user?.token]);

  const toggleMenu = (menuId: string | number) => {
    setOpenMenus((prev) => ({
      ...prev,
      [menuId]: !prev[menuId],
    }));
  };

  const formatLabel = (value: string) =>
    value
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');

  const normalizeLink = (link?: string) => {
    if (!link) return '#';
    if (link.startsWith('http://') || link.startsWith('https://')) return link;
    const normalized = link.startsWith('/') ? link : `/${link}`;
    if (normalized.startsWith('/finance/addPayment')) {
      return normalized.replace('/finance/addPayment', '/modules/billing/finance/payment/add');
    }
    if (normalized.startsWith('\/modules/lab/requestedLab')) {
      return normalized.replace('\/modules/lab/requestedLab', '\/modules/lab/requested-investigations');
    }
    return normalized;
  };

  const getLinkPath = (link?: string) => normalizeLink(link).split('?')[0];

  const menuSubsByMenu = useMemo(() => {
    const grouped: Record<string, MenuSubItem[]> = {};
    menuSubs.forEach((sub) => {
      if (!grouped[sub.menu]) {
        grouped[sub.menu] = [];
      }
      grouped[sub.menu].push(sub);
    });

    Object.values(grouped).forEach((items) => {
      items.sort((a, b) => (a.sort_order ?? a.id) - (b.sort_order ?? b.id));
    });

    return grouped;
  }, [menuSubs]);

  const sortedMenus = useMemo(() => {
    return [...menus].sort((a, b) => (a.sort_order ?? a.id) - (b.sort_order ?? b.id));
  }, [menus]);

  return (
    <aside className="main-sidebar sidebar-dark-primary elevation-4">
      {/* Brand Logo */}
      <Link href="/dashboard" className="brand-link">
        <img
          src="/images/lcd_logo.png"
          alt="LCD"
          className="brand-image img-circle elevation-3"
          style={{ opacity: 0.8 }}
        />
        <span className="brand-text font-weight-light">LCD</span>
      </Link>

      {/* Sidebar */}
      <div className="sidebar">
        {/* Sidebar Menu */}
        <nav className="mt-2">
          <ul className="nav nav-pills nav-sidebar flex-column" data-widget="treeview" role="menu" data-accordion="false">
            <li className="nav-header">SYSTEM</li>

            <li className="nav-item">
              <Link href="/settings/menus" className={`nav-link ${pathname === '/settings/menus' ? 'active' : ''}`}>
                <i className="nav-icon fas fa-bars"></i>
                <p>Menu</p>
              </Link>
            </li>

            {loading && (
              <li className="nav-item">
                <span className="nav-link text-muted">
                  <i className="nav-icon fas fa-circle"></i>
                  <p>Loading menu...</p>
                </span>
              </li>
            )}

            {!loading && sortedMenus.map((item) => {
              const submenuItems = menuSubsByMenu[item.name] || [];
              const hasSubmenu = submenuItems.length > 0;
              const isActive = hasSubmenu
                ? submenuItems.some((sub) => getLinkPath(sub.link) === pathname)
                : false;
              const isOpen = openMenus[item.id] ?? isActive;

              return (
                <li key={item.id} className={`nav-item ${isOpen ? 'menu-is-opening menu-open' : ''}`}>
                  {hasSubmenu ? (
                    <>
                      <a
                        href="javascript:;"
                        className={`nav-link ${isActive ? 'active' : ''}`}
                        onClick={(e) => {
                          e.preventDefault();
                          toggleMenu(item.id);
                        }}
                      >
                        <i className={`nav-icon fas fa-${item.icon || 'circle'}`}></i>
                        <p>
                          {formatLabel(item.name)}
                          <i className="right fas fa-angle-left"></i>
                        </p>
                      </a>
                      <ul className="nav nav-treeview">
                        {submenuItems.map((sub) => {
                          const link = normalizeLink(sub.link);
                          const isSubActive = getLinkPath(sub.link) === pathname;
                          const color = (sub.color || 'primary').toLowerCase();

                          return (
                            <li key={sub.id} className="nav-item">
                              <Link
                                href={link}
                                className={`nav-link ${isSubActive ? 'active' : ''}`}
                              >
                                <i className={`far fa-circle nav-icon text-${color}`}></i>
                                <p>{formatLabel(sub.name)}</p>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    </>
                  ) : (
                    <span className="nav-link">
                      <i className={`nav-icon fas fa-${item.icon || 'circle'}`}></i>
                      <p>{formatLabel(item.name)}</p>
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;

