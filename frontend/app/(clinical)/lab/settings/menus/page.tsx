'use client';

import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

type MenuItem = {
  id: number;
  name: string;
  icon?: string;
  sort_order?: number;
  groups?: number[];
  group_names?: string[];
};

type RoleGroup = {
  id: number;
  name: string;
};

const FONT_AWESOME_ICON_OPTIONS = [
  'bars',
  'tachometer-alt',
  'cog',
  'flask',
  'user-md',
  'users',
  'calendar-alt',
  'notes-medical',
  'pills',
  'cash-register',
  'chart-bar',
  'sms',
  'globe',
  'file-alt',
  'envelope',
  'bell',
];

const SUBMENU_COLOR_ORDER = ['primary', 'info', 'success', 'warning', 'danger', 'secondary'];

type MenuSubItem = {
  id: number;
  name: string;
  menu: string;
  link?: string;
  color?: string;
  sort_order?: number;
  groups?: number[];
};

const MenusPage = () => {
  const { user } = useAuth();
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [menuSubs, setMenuSubs] = useState<MenuSubItem[]>([]);
  const [groups, setGroups] = useState<RoleGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [subSaving, setSubSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingSubId, setEditingSubId] = useState<number | null>(null);
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [showSubModal, setShowSubModal] = useState(false);
  const [showIconDropdown, setShowIconDropdown] = useState(false);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [showSubRoleDropdown, setShowSubRoleDropdown] = useState(false);
  const [roleSearch, setRoleSearch] = useState('');
  const [subRoleSearch, setSubRoleSearch] = useState('');
  const [savingOrder, setSavingOrder] = useState(false);
  const [dragMenuId, setDragMenuId] = useState<number | null>(null);
  const [dragSubId, setDragSubId] = useState<number | null>(null);
  const [expandedMenus, setExpandedMenus] = useState<Record<number, boolean>>({});

  const [formData, setFormData] = useState({
    name: '',
    icon: '',
    groups: [] as number[],
    addSubmenu: true,
    submenuName: '',
    submenuLink: '',
  });

  const [subFormData, setSubFormData] = useState({
    name: '',
    menu: '',
    link: '',
    groups: [] as number[],
  });
  const iconDropdownRef = useRef<HTMLDivElement | null>(null);
  const roleDropdownRef = useRef<HTMLDivElement | null>(null);
  const subRoleDropdownRef = useRef<HTMLDivElement | null>(null);

  const filteredGroups = useMemo(() => {
    const term = roleSearch.trim().toLowerCase();
    if (!term) return groups;
    return groups.filter((group) => group.name.toLowerCase().includes(term));
  }, [groups, roleSearch]);

  const filteredSubGroups = useMemo(() => {
    const term = subRoleSearch.trim().toLowerCase();
    if (!term) return groups;
    return groups.filter((group) => group.name.toLowerCase().includes(term));
  }, [groups, subRoleSearch]);

  const fetchData = async () => {
    if (!user?.token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [menuData, menuSubData, groupData] = await Promise.all([
        api.getAllMenus(user.token),
        api.getAllMenuSubs(user.token),
        api.getGroups(user.token),
      ]);
      const normalizedMenus = Array.isArray(menuData)
        ? [...menuData].sort((a, b) => (a.sort_order ?? a.id) - (b.sort_order ?? b.id))
        : [];
      const normalizedSubs = Array.isArray(menuSubData)
        ? [...menuSubData].sort((a, b) => (a.sort_order ?? a.id) - (b.sort_order ?? b.id))
        : [];
      setMenus(normalizedMenus);
      setMenuSubs(normalizedSubs);
      setGroups(Array.isArray(groupData) ? groupData : []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load menus');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user?.token]);

  useEffect(() => {
    setExpandedMenus((prev) => {
      const next = { ...prev };
      menus.forEach((menu) => {
        if (next[menu.id] === undefined) {
          next[menu.id] = true;
        }
      });
      return next;
    });
  }, [menus]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showIconDropdown &&
        iconDropdownRef.current &&
        !iconDropdownRef.current.contains(event.target as Node)
      ) {
        setShowIconDropdown(false);
      }

      if (
        showRoleDropdown &&
        roleDropdownRef.current &&
        !roleDropdownRef.current.contains(event.target as Node)
      ) {
        setShowRoleDropdown(false);
      }

      if (
        showSubRoleDropdown &&
        subRoleDropdownRef.current &&
        !subRoleDropdownRef.current.contains(event.target as Node)
      ) {
        setShowSubRoleDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showIconDropdown, showRoleDropdown, showSubRoleDropdown]);

  const subsByMenu = useMemo(() => {
    const grouped: Record<string, MenuSubItem[]> = {};
    menuSubs.forEach((sub) => {
      if (!grouped[sub.menu]) grouped[sub.menu] = [];
      grouped[sub.menu].push(sub);
    });
    Object.keys(grouped).forEach((menuName) => {
      grouped[menuName] = grouped[menuName].sort(
        (a, b) => (a.sort_order ?? a.id) - (b.sort_order ?? b.id)
      );
    });
    return grouped;
  }, [menuSubs]);

  const getSubmenuColorByIndex = (index: number) => {
    return SUBMENU_COLOR_ORDER[index % SUBMENU_COLOR_ORDER.length];
  };

  const persistMenuOrder = async (orderedMenus: MenuItem[]) => {
    if (!user?.token) return;
    setSavingOrder(true);
    setError(null);
    try {
      await Promise.all(
        orderedMenus.map((menu, index) =>
          api.updateMenu(user.token!, menu.id, {
            name: menu.name,
            icon: menu.icon || '',
            sort_order: index + 1,
          })
        )
      );
    } catch (err: any) {
      setError(err?.message || 'Failed to save menu order');
      await fetchData();
    } finally {
      setSavingOrder(false);
    }
  };

  const persistSubOrder = async (orderedSubs: MenuSubItem[]) => {
    if (!user?.token) return;
    setSavingOrder(true);
    setError(null);
    try {
      const normalizedOrderedSubs = orderedSubs.map((sub, index) => ({
        ...sub,
        sort_order: index + 1,
        color: getSubmenuColorByIndex(index),
      }));

      await Promise.all(
        normalizedOrderedSubs.map((sub, index) =>
          api.updateMenuSub(user.token!, sub.id, {
            name: sub.name,
            menu: sub.menu,
            link: sub.link || '',
            color: sub.color,
            value: '',
            sort_order: index + 1,
            groups: sub.groups || [],
          })
        )
      );
    } catch (err: any) {
      setError(err?.message || 'Failed to save submenu order');
      await fetchData();
    } finally {
      setSavingOrder(false);
    }
  };

  const handleMenuDrop = async (targetMenuId: number) => {
    if (dragMenuId === null || dragMenuId === targetMenuId) return;

    const current = [...menus].sort((a, b) => (a.sort_order ?? a.id) - (b.sort_order ?? b.id));
    const fromIndex = current.findIndex((menu) => menu.id === dragMenuId);
    const toIndex = current.findIndex((menu) => menu.id === targetMenuId);
    if (fromIndex < 0 || toIndex < 0) return;

    const [moved] = current.splice(fromIndex, 1);
    current.splice(toIndex, 0, moved);
    const reordered = current.map((menu, index) => ({ ...menu, sort_order: index + 1 }));
    setMenus(reordered);
    setDragMenuId(null);
    await persistMenuOrder(reordered);
  };

  const toggleMenuExpanded = (menuId: number) => {
    setExpandedMenus((prev) => ({
      ...prev,
      [menuId]: !prev[menuId],
    }));
  };

  const handleSubDrop = async (targetSub: MenuSubItem) => {
    if (dragSubId === null || dragSubId === targetSub.id) return;

    const dragged = menuSubs.find((sub) => sub.id === dragSubId);
    if (!dragged || dragged.menu !== targetSub.menu) {
      setDragSubId(null);
      return;
    }

    const sameMenuSubs = menuSubs
      .filter((sub) => sub.menu === targetSub.menu)
      .sort((a, b) => (a.sort_order ?? a.id) - (b.sort_order ?? b.id));

    const fromIndex = sameMenuSubs.findIndex((sub) => sub.id === dragSubId);
    const toIndex = sameMenuSubs.findIndex((sub) => sub.id === targetSub.id);
    if (fromIndex < 0 || toIndex < 0) return;

    const [moved] = sameMenuSubs.splice(fromIndex, 1);
    sameMenuSubs.splice(toIndex, 0, moved);

    const reorderedForMenu = sameMenuSubs.map((sub, index) => ({
      ...sub,
      sort_order: index + 1,
      color: getSubmenuColorByIndex(index),
    }));

    const merged = menuSubs.map((sub) => {
      const updated = reorderedForMenu.find((item) => item.id === sub.id);
      return updated || sub;
    });

    setMenuSubs(merged);
    setDragSubId(null);
    await persistSubOrder(reorderedForMenu);
  };

  const resetForm = () => {
    setEditingId(null);
    setShowMenuModal(false);
    setShowRoleDropdown(false);
    setRoleSearch('');
    setFormData({
      name: '',
      icon: '',
      groups: [],
      addSubmenu: true,
      submenuName: '',
      submenuLink: '',
    });
  };

  const resetSubForm = () => {
    setEditingSubId(null);
    setShowSubModal(false);
    setShowSubRoleDropdown(false);
    setSubRoleSearch('');
    setSubFormData({
      name: '',
      menu: '',
      link: '',
      groups: [],
    });
  };

  const handleEdit = (item: MenuItem) => {
    setEditingId(item.id);
    setShowMenuModal(true);
    setFormData((prev) => ({
      ...prev,
      name: item.name,
      icon: item.icon || '',
      groups: Array.isArray(item.groups) ? item.groups : [],
      addSubmenu: false,
      submenuName: '',
      submenuLink: '',
    }));
  };

  const handleDelete = async (id: number) => {
    if (!user?.token) return;
    if (!window.confirm('Delete this menu? Its submenu records may also be removed.')) return;

    setError(null);
    try {
      await api.deleteMenu(user.token, id);
      if (editingId === id) {
        resetForm();
      }
      await fetchData();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete menu');
    }
  };

  const handleEditSub = (sub: MenuSubItem) => {
    setEditingSubId(sub.id);
    setShowSubModal(true);
    setSubFormData({
      name: sub.name,
      menu: sub.menu,
      link: sub.link || '',
      groups: Array.isArray(sub.groups) ? sub.groups : [],
    });
  };

  const handleAddSubForMenu = (menuName: string) => {
    setEditingSubId(null);
    setShowSubModal(true);
    const selectedMenu = menus.find((menu) => menu.name === menuName);
    setSubFormData({
      name: '',
      menu: menuName,
      link: '',
      groups: Array.isArray(selectedMenu?.groups) ? selectedMenu!.groups! : [],
    });
  };

  const handleAddMenu = () => {
    setEditingId(null);
    setShowMenuModal(true);
    setShowIconDropdown(false);
    setFormData({
      name: '',
      icon: '',
      groups: [],
      addSubmenu: true,
      submenuName: '',
      submenuLink: '',
    });
  };

  const handleDeleteSub = async (id: number) => {
    if (!user?.token) return;
    if (!window.confirm('Delete this submenu?')) return;

    setError(null);
    try {
      await api.deleteMenuSub(user.token, id);
      if (editingSubId === id) {
        resetSubForm();
      }
      await fetchData();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete submenu');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.token) return;

    setSaving(true);
    setError(null);

    try {
      const payload = {
        name: formData.name.trim(),
        icon: formData.icon.trim(),
        groups: formData.groups,
      };

      if (editingId) {
        await api.updateMenu(user.token, editingId, payload);
      } else {
        const created = (await api.createMenu(user.token, payload)) as any;

        if (formData.addSubmenu && formData.submenuName.trim()) {
          const existingSubCount = menuSubs.filter(
            (sub) => sub.menu === (created?.name || payload.name)
          ).length;

          await api.createMenuSub(user.token, {
            name: formData.submenuName.trim(),
            menu: created?.name || payload.name,
            link: formData.submenuLink.trim(),
            color: getSubmenuColorByIndex(existingSubCount),
            value: '',
          });
        }
      }

      resetForm();
      await fetchData();
    } catch (err: any) {
      setError(err?.message || 'Failed to save menu');
    } finally {
      setSaving(false);
    }
  };

  const handleSubSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.token) return;

    setSubSaving(true);
    setError(null);

    try {
      const basePosition = menuSubs
        .filter((sub) => sub.menu === subFormData.menu && sub.id !== editingSubId)
        .length;

      const payload = {
        name: subFormData.name.trim(),
        menu: subFormData.menu,
        link: subFormData.link.trim(),
        color: getSubmenuColorByIndex(basePosition),
        value: '',
        groups: subFormData.groups,
      };

      if (editingSubId) {
        await api.updateMenuSub(user.token, editingSubId, payload);
      } else {
        await api.createMenuSub(user.token, payload);
      }

      resetSubForm();
      await fetchData();
    } catch (err: any) {
      setError(err?.message || 'Failed to save submenu');
    } finally {
      setSubSaving(false);
    }
  };

  return (
    <>
      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1 className="m-0">Menu Management</h1>
            </div>
            <div className="col-sm-6">
              <ol className="breadcrumb float-sm-right">
                <li className="breadcrumb-item"><Link href="/">Home</Link></li>
                <li className="breadcrumb-item">System</li>
                <li className="breadcrumb-item active">Menus</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      <section className="content">
        <div className="container-fluid">
          {error && <div className="alert alert-danger">{error}</div>}

          <div className="card">
            <div className="card-header d-flex align-items-center">
              <h3 className="card-title">Menu / Submenu Hierarchy</h3>
              {savingOrder && <span className="text-muted mr-3">Saving order...</span>}
              <button type="button" className="btn btn-primary btn-sm ml-auto" onClick={handleAddMenu}>
                <i className="fa fa-plus" /> Add Menu
              </button>
            </div>
            <div className="card-body p-0">
              {loading ? (
                <div className="p-3 text-center">Loading menu hierarchy...</div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-bordered table-striped mb-0">
                    <thead>
                      <tr>
                        <th style={{ width: 110 }}>Type</th>
                        <th>Name</th>
                        <th>Link / Icon</th>
                        <th>Parent / Roles</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {menus.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center">No menus found</td>
                        </tr>
                      ) : (
                        menus.map((item) => {
                          const subItems = subsByMenu[item.name] || [];
                          const isExpanded = expandedMenus[item.id] ?? true;

                          return (
                            <Fragment key={`group-${item.id}`}>
                              <tr
                                key={`menu-${item.id}`}
                                draggable
                                onDragStart={() => setDragMenuId(item.id)}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={async () => handleMenuDrop(item.id)}
                                style={{ cursor: 'move' }}
                              >
                                <td><span className="badge badge-primary">Menu</span></td>
                                <td className="font-weight-bold">
                                  <button
                                    type="button"
                                    className="btn btn-link btn-sm p-0 mr-2"
                                    onClick={() => toggleMenuExpanded(item.id)}
                                    title={isExpanded ? 'Collapse submenus' : 'Expand submenus'}
                                  >
                                    <i className={`fas fa-chevron-${isExpanded ? 'down' : 'right'}`}></i>
                                  </button>
                                  {item.name}
                                </td>
                                <td>{item.icon || '-'}</td>
                                <td>
                                  {Array.isArray(item.group_names) && item.group_names.length > 0
                                    ? item.group_names.join(', ')
                                    : '-'}
                                </td>
                                <td>
                                  <button
                                    type="button"
                                    className="btn btn-info btn-sm mr-2"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEdit(item);
                                    }}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-success btn-sm mr-2"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAddSubForMenu(item.name);
                                    }}
                                  >
                                    Add Submenu
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-danger btn-sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDelete(item.id);
                                    }}
                                  >
                                    Delete
                                  </button>
                                </td>
                              </tr>

                              {isExpanded && subItems.length === 0 ? (
                                <tr key={`menu-${item.id}-empty`}>
                                  <td><span className="badge badge-secondary">Submenu</span></td>
                                  <td className="pl-4 text-muted">No submenu</td>
                                  <td className="text-muted">-</td>
                                  <td className="text-muted">Parent: {item.name}</td>
                                  <td className="text-muted">-</td>
                                </tr>
                              ) : isExpanded ? (
                                subItems.map((sub) => (
                                  <tr
                                    key={`sub-${sub.id}`}
                                    draggable
                                    onDragStart={() => setDragSubId(sub.id)}
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={async () => handleSubDrop(sub)}
                                    style={{ cursor: 'move' }}
                                  >
                                    <td><span className="badge badge-secondary">Submenu</span></td>
                                    <td className="pl-4">↳ {sub.name}</td>
                                    <td>
                                      <div>{sub.link || '-'}</div>
                                      <span className={`badge badge-${sub.color || 'primary'} mt-1`}>
                                        {sub.color || 'primary'}
                                      </span>
                                    </td>
                                    <td>Parent: {sub.menu}</td>
                                    <td>
                                      <button
                                        type="button"
                                        className="btn btn-info btn-sm mr-2"
                                        onClick={() => handleEditSub(sub)}
                                      >
                                        Edit
                                      </button>
                                      <button
                                        type="button"
                                        className="btn btn-danger btn-sm"
                                        onClick={() => handleDeleteSub(sub.id)}
                                      >
                                        Delete
                                      </button>
                                    </td>
                                  </tr>
                                ))
                              ) : null}
                            </Fragment>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {showMenuModal && (
            <div className="modal d-block" tabIndex={-1} role="dialog" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
              <div className="modal-dialog" role="document">
                <div className="modal-content">
                  <form onSubmit={handleSubmit}>
                    <div className="modal-header">
                      <h5 className="modal-title">{editingId ? 'Update Menu' : 'Add Menu'}</h5>
                      <button type="button" className="close" aria-label="Close" onClick={resetForm}>
                        <span aria-hidden="true">&times;</span>
                      </button>
                    </div>
                    <div className="modal-body">
                      <div className="form-group">
                        <label htmlFor="name">Menu Name *</label>
                        <input
                          id="name"
                          type="text"
                          className="form-control"
                          value={formData.name}
                          onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="icon">Icon (Font Awesome name)</label>
                        <div className="input-group mb-2">
                          <div className="input-group-prepend">
                            <span className="input-group-text">
                              <i className={`fas fa-${formData.icon || 'circle'}`}></i>
                            </span>
                          </div>
                          <input
                            id="icon"
                            type="text"
                            className="form-control"
                            placeholder="cog"
                            value={formData.icon}
                            onChange={(e) => setFormData((prev) => ({ ...prev, icon: e.target.value }))}
                          />
                        </div>
                        <div className="position-relative" ref={iconDropdownRef}>
                          <button
                            type="button"
                            className="form-control form-control-sm d-flex align-items-center justify-content-between"
                            onClick={() => setShowIconDropdown((prev) => !prev)}
                          >
                            <span>
                              {formData.icon ? (
                                <>
                                  <i className={`fas fa-${formData.icon} mr-2`}></i>
                                  {formData.icon}
                                </>
                              ) : (
                                <span className="text-muted">Select Font Awesome icon...</span>
                              )}
                            </span>
                            <i className={`fas fa-chevron-${showIconDropdown ? 'up' : 'down'} text-muted`}></i>
                          </button>

                          {showIconDropdown && (
                            <div className="dropdown-menu show w-100 p-1 shadow-sm" style={{ maxHeight: 220, overflowY: 'auto' }}>
                              {FONT_AWESOME_ICON_OPTIONS.map((icon) => (
                                <button
                                  key={icon}
                                  type="button"
                                  className={`dropdown-item d-flex align-items-center ${formData.icon === icon ? 'active' : ''}`}
                                  onClick={() => {
                                    setFormData((prev) => ({ ...prev, icon }));
                                    setShowIconDropdown(false);
                                  }}
                                >
                                  <i className={`fas fa-${icon} mr-2`}></i>
                                  <span>{icon}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="form-group">
                        <label htmlFor="groups">Roles</label>
                        <div className="position-relative" ref={roleDropdownRef}>
                          <button
                            type="button"
                            id="groups"
                            className="form-control d-flex align-items-center justify-content-between bg-white"
                            onClick={() => setShowRoleDropdown((prev) => !prev)}
                            style={{ minHeight: 46 }}
                          >
                            <div className="text-left w-100 pr-2">
                              {formData.groups.length === 0 ? (
                                <span className="text-muted">Select roles</span>
                              ) : (
                                <div className="d-flex flex-wrap align-items-center">
                                  <span className="badge badge-light border mr-2 mb-1 px-2 py-1">
                                    {formData.groups.length} selected
                                  </span>
                                {groups
                                  .filter((group) => formData.groups.includes(group.id))
                                  .map((group) => (
                                    <span key={group.id} className="badge badge-primary mr-1 mb-1 px-2 py-1" style={{ borderRadius: 20 }}>
                                      {group.name}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                            <i className={`fas fa-chevron-${showRoleDropdown ? 'up' : 'down'} text-muted ml-2`}></i>
                          </button>

                          {showRoleDropdown && (
                            <div className="dropdown-menu show w-100 p-0 shadow border" style={{ maxHeight: 280, overflow: 'hidden' }}>
                              <div className="px-2 py-2 border-bottom bg-light">
                                <input
                                  type="text"
                                  className="form-control form-control-sm"
                                  placeholder="Search roles..."
                                  value={roleSearch}
                                  onChange={(e) => setRoleSearch(e.target.value)}
                                />
                              </div>
                              <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                              {groups.length === 0 ? (
                                <span className="dropdown-item-text text-muted">No roles found</span>
                              ) : filteredGroups.length === 0 ? (
                                <span className="dropdown-item-text text-muted">No matching roles</span>
                              ) : (
                                filteredGroups.map((group) => {
                                  const checked = formData.groups.includes(group.id);
                                  return (
                                    <label
                                      key={group.id}
                                      className={`dropdown-item mb-0 d-flex align-items-center justify-content-between ${checked ? 'bg-light' : ''}`}
                                      style={{ cursor: 'pointer' }}
                                    >
                                      <span>
                                      <input
                                        type="checkbox"
                                        className="mr-2"
                                        checked={checked}
                                        onChange={() => {
                                          setFormData((prev) => ({
                                            ...prev,
                                            groups: checked
                                              ? prev.groups.filter((groupId) => groupId !== group.id)
                                              : [...prev.groups, group.id],
                                          }));
                                        }}
                                      />
                                      {group.name}
                                      </span>
                                      {checked && <i className="fas fa-check text-primary"></i>}
                                    </label>
                                  );
                                })
                              )}
                              </div>
                            </div>
                          )}
                        </div>
                        <small className="form-text text-muted">Select one or more roles.</small>
                      </div>

                      {!editingId && (
                        <>
                          <div className="form-group form-check mb-3">
                            <input
                              id="addSubmenu"
                              type="checkbox"
                              className="form-check-input"
                              checked={formData.addSubmenu}
                              onChange={(e) => setFormData((prev) => ({ ...prev, addSubmenu: e.target.checked }))}
                            />
                            <label htmlFor="addSubmenu" className="form-check-label">
                              Add submenu in menu_sub table while creating menu
                            </label>
                          </div>

                          {formData.addSubmenu && (
                            <>
                              <div className="form-group">
                                <label htmlFor="submenuName">Submenu Name</label>
                                <input
                                  id="submenuName"
                                  type="text"
                                  className="form-control"
                                  value={formData.submenuName}
                                  onChange={(e) => setFormData((prev) => ({ ...prev, submenuName: e.target.value }))}
                                />
                              </div>
                              <div className="form-group">
                                <label htmlFor="submenuLink">Submenu Link</label>
                                <input
                                  id="submenuLink"
                                  type="text"
                                  className="form-control"
                                  placeholder="/settings/menus"
                                  value={formData.submenuLink}
                                  onChange={(e) => setFormData((prev) => ({ ...prev, submenuLink: e.target.value }))}
                                />
                              </div>
                              <div className="form-group mb-0">
                                <small className="form-text text-muted">
                                  Submenu color is assigned automatically in order.
                                </small>
                              </div>
                            </>
                          )}
                        </>
                      )}
                    </div>
                    <div className="modal-footer">
                      <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
                        {saving ? 'Saving...' : editingId ? 'Update Menu' : 'Create Menu'}
                      </button>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={resetForm}>
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {showSubModal && (
            <div className="modal d-block" tabIndex={-1} role="dialog" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
              <div className="modal-dialog" role="document">
                <div className="modal-content">
                  <form onSubmit={handleSubSubmit}>
                    <div className="modal-header">
                      <h5 className="modal-title">{editingSubId ? 'Update Submenu' : 'Add Submenu'}</h5>
                      <button type="button" className="close" aria-label="Close" onClick={resetSubForm}>
                        <span aria-hidden="true">&times;</span>
                      </button>
                    </div>
                    <div className="modal-body">
                      <div className="form-group">
                        <label htmlFor="subName">Submenu Name *</label>
                        <input
                          id="subName"
                          type="text"
                          className="form-control"
                          value={subFormData.name}
                          onChange={(e) => setSubFormData((prev) => ({ ...prev, name: e.target.value }))}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="subMenu">Menu *</label>
                        <select
                          id="subMenu"
                          className="form-control"
                          value={subFormData.menu}
                          onChange={(e) => setSubFormData((prev) => ({ ...prev, menu: e.target.value }))}
                          required
                        >
                          <option value="">Select Menu</option>
                          {menus.map((menu) => (
                            <option key={menu.id} value={menu.name}>{menu.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label htmlFor="subLink">Link</label>
                        <input
                          id="subLink"
                          type="text"
                          className="form-control"
                          placeholder="/settings/menus"
                          value={subFormData.link}
                          onChange={(e) => setSubFormData((prev) => ({ ...prev, link: e.target.value }))}
                        />
                      </div>
                      <div className="form-group mb-0">
                        <small className="form-text text-muted">
                          Color is assigned automatically in sequence to avoid nearby duplicates.
                        </small>
                      </div>

                      <div className="form-group mt-3 mb-0">
                        <label htmlFor="subGroups">Roles</label>
                        <div className="position-relative" ref={subRoleDropdownRef}>
                          <button
                            type="button"
                            id="subGroups"
                            className="form-control d-flex align-items-center justify-content-between bg-white"
                            onClick={() => setShowSubRoleDropdown((prev) => !prev)}
                            style={{ minHeight: 46 }}
                          >
                            <div className="text-left w-100 pr-2">
                              {subFormData.groups.length === 0 ? (
                                <span className="text-muted">Select roles</span>
                              ) : (
                                <div className="d-flex flex-wrap align-items-center">
                                  <span className="badge badge-light border mr-2 mb-1 px-2 py-1">
                                    {subFormData.groups.length} selected
                                  </span>
                                  {groups
                                    .filter((group) => subFormData.groups.includes(group.id))
                                    .map((group) => (
                                      <span key={group.id} className="badge badge-primary mr-1 mb-1 px-2 py-1" style={{ borderRadius: 20 }}>
                                        {group.name}
                                      </span>
                                    ))}
                                </div>
                              )}
                            </div>
                            <i className={`fas fa-chevron-${showSubRoleDropdown ? 'up' : 'down'} text-muted ml-2`}></i>
                          </button>

                          {showSubRoleDropdown && (
                            <div className="dropdown-menu show w-100 p-0 shadow border" style={{ maxHeight: 280, overflow: 'hidden' }}>
                              <div className="px-2 py-2 border-bottom bg-light">
                                <input
                                  type="text"
                                  className="form-control form-control-sm"
                                  placeholder="Search roles..."
                                  value={subRoleSearch}
                                  onChange={(e) => setSubRoleSearch(e.target.value)}
                                />
                              </div>
                              <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                                {groups.length === 0 ? (
                                  <span className="dropdown-item-text text-muted">No roles found</span>
                                ) : filteredSubGroups.length === 0 ? (
                                  <span className="dropdown-item-text text-muted">No matching roles</span>
                                ) : (
                                  filteredSubGroups.map((group) => {
                                    const checked = subFormData.groups.includes(group.id);
                                    return (
                                      <label
                                        key={group.id}
                                        className={`dropdown-item mb-0 d-flex align-items-center justify-content-between ${checked ? 'bg-light' : ''}`}
                                        style={{ cursor: 'pointer' }}
                                      >
                                        <span>
                                          <input
                                            type="checkbox"
                                            className="mr-2"
                                            checked={checked}
                                            onChange={() => {
                                              setSubFormData((prev) => ({
                                                ...prev,
                                                groups: checked
                                                  ? prev.groups.filter((groupId) => groupId !== group.id)
                                                  : [...prev.groups, group.id],
                                              }));
                                            }}
                                          />
                                          {group.name}
                                        </span>
                                        {checked && <i className="fas fa-check text-primary"></i>}
                                      </label>
                                    );
                                  })
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        <small className="form-text text-muted">Select one or more roles.</small>
                      </div>
                    </div>
                    <div className="modal-footer">
                      <button type="submit" className="btn btn-success btn-sm" disabled={subSaving}>
                        {subSaving ? 'Saving...' : editingSubId ? 'Update Submenu' : 'Add Submenu'}
                      </button>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={resetSubForm}>
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
};

export default MenusPage;
