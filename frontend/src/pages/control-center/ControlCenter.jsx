import React from "react";
import "./style.scss";
import { Layout, Menu } from "antd";
const { Sider } = Layout;
import { store, config } from "../../lib";
import { useNavigate, Outlet } from "react-router-dom";
import {
  UserOutlined,
  TableOutlined,
  DatabaseOutlined,
} from "@ant-design/icons";

const ControlCenter = () => {
  const { user: authUser } = store.useState((s) => s);
  const navigate = useNavigate();

  const { roles } = config;

  const pageAccessToLabelAndUrlMapping = {
    user: { label: "Manage Platform Users", url: "/control-center/users" },
    approvers: {
      label: "Validation Tree",
      url: "/control-center/approvers/tree",
    },
    mobile: { label: "Manage Mobile Users", url: "/manage-mobile-users" },
    data: [
      { label: "Manage Data", url: "/manage-data" },
      { label: "Download Data", url: "/download-data" },
    ],
    "master-data": [
      { label: "Administrative List", url: "/administrative-list" },
      { label: "Attributes", url: "/attributes" },
      { label: "Entities", url: "/entities" },
      { label: "Entity Types", url: "/entity-types" },
      { label: "Organisations", url: "/organisations" },
    ],
  };

  const controlCenterToLabelMapping = {
    "manage-user": {
      label: "Users",
      icon: UserOutlined,
      childrenKeys: ["user", "approvers", "mobile"],
    },
    "manage-data": {
      label: "Data",
      icon: TableOutlined,
      childrenKeys: ["data"],
    },
    "manage-master-data": {
      label: "Master Data",
      icon: DatabaseOutlined,
      childrenKeys: ["master-data"],
    },
  };

  const determineChildren = (key) => {
    const mapping = pageAccessToLabelAndUrlMapping[key];
    if (Array.isArray(mapping)) {
      return mapping.map((item, index) => ({
        key: key + "_" + index,
        ...item,
      }));
    }
    return [{ key, ...mapping }];
  };

  const createMenuItems = (controlCenterOrder, pageAccess) => {
    return controlCenterOrder
      .map((orderKey) => {
        const controlCenterItem = controlCenterToLabelMapping[orderKey];

        if (!controlCenterItem) {
          return null;
        }

        const { label, icon, childrenKeys } = controlCenterItem;

        const children = childrenKeys
          .filter((key) => pageAccess.includes(key.split(/(\d+)/)[0]))
          .flatMap((key) => determineChildren(key, pageAccess));

        return {
          key: orderKey,
          icon: icon ? React.createElement(icon) : null,
          label,
          children: children.length ? children : null,
        };
      })
      .filter(Boolean);
  };

  const superAdminRole = roles.find((r) => r.id === authUser?.role_detail?.id);
  const usersMenuItem = createMenuItems(
    superAdminRole.control_center_order,
    superAdminRole.page_access
  );

  const handleMenuClick = ({ key }) => {
    const url = findUrlByKey(usersMenuItem, key);
    navigate(url);
  };

  const findUrlByKey = (items, key) => {
    for (const item of items) {
      if (item.key === key) {
        return item.url;
      }
      if (item.children) {
        const url = findUrlByKey(item.children, key);
        if (url) {
          return url;
        }
      }
    }
  };

  return (
    <div id="control-center">
      <Layout>
        <Sider className="site-layout-background">
          <Menu
            mode="inline"
            defaultSelectedKeys={["1"]}
            defaultOpenKeys={["sub1"]}
            style={{
              height: "100%",
              borderRight: 0,
            }}
            onClick={handleMenuClick}
            items={usersMenuItem}
          />
        </Sider>
        <Layout className="site-layout">
          <Outlet />
        </Layout>
      </Layout>
    </div>
  );
};

export default React.memo(ControlCenter);
