import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Divider, Col, Row, Space, Table } from "antd";
import { Link } from "react-router-dom";

import {
  Breadcrumbs,
  DescriptionPanel,
  EntityDataFilters,
} from "../../../components";
import { api, store, uiText } from "../../../lib";

const EntityData = () => {
  const [loading, setLoading] = useState(true);
  const [dataset, setDataset] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const [entityType, setEntityType] = useState();
  const { language, administration } = store.useState((s) => s);
  const { active: activeLang } = language;
  const administrationFilter = administration?.slice(-1)?.[0]?.id;

  const text = useMemo(() => {
    return uiText[activeLang];
  }, [activeLang]);

  const pagePath = [
    {
      title: text.controlCenter,
      link: "/control-center",
    },
    {
      title: text.manageEntities,
    },
  ];

  const columns = [
    {
      title: "#",
      dataIndex: "id",
      key: "number",
      width: 100,
      render: (row, record, index) => (
        <div data-key={row} data-id={record?.id}>
          {index + 1}
        </div>
      ),
    },
    {
      title: text.nameField,
      dataIndex: "name",
    },
    {
      title: text.codeField,
      dataIndex: "code",
      width: "10%",
    },
    {
      title: text.administrationField,
      dataIndex: "administration",
      render: (row) => row?.name || "",
    },
    {
      title: text.entityType,
      dataIndex: "entity",
      render: (row) => row?.name || "",
    },
    {
      title: text.actionColumn,
      dataIndex: "id",
      key: "action",
      width: "10%",
      render: (row) => {
        return (
          <Space>
            <Link to={`/control-center/master-data/entities/${row}/edit`}>
              <Button type="link">{text.editButton}</Button>
            </Link>
          </Space>
        );
      },
    },
  ];

  const handleChange = (e) => {
    setCurrentPage(e.current);
  };

  const fetchData = useCallback(async () => {
    try {
      let url = `/entity-data?page=${currentPage}`;
      if (administrationFilter && administrationFilter !== 1) {
        url = url + `&administration=${administrationFilter}`;
      }
      if (entityType) {
        url = url + `&entity=${entityType}`;
      }
      if (search) {
        url = url + `&search=${search}`;
      }
      const { data: apiData } = await api.get(url);
      const { total, current, data } = apiData;
      setDataset(data);
      setTotalCount(total);
      setCurrentPage(current);
      setLoading(false);
    } catch {
      setLoading(false);
    }
  }, [currentPage, administrationFilter, entityType, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div id="users">
      <div className="description-container">
        <Row justify="space-between" align="bottom">
          <Col>
            <Breadcrumbs pagePath={pagePath} />
            <DescriptionPanel
              description={text.manageEntitiesText}
              title={text.manageEntities}
            />
          </Col>
        </Row>
      </div>
      <div className="table-section">
        <div className="table-wrapper">
          <EntityDataFilters
            loading={loading}
            onSearchChange={setSearch}
            onEntityTypeChange={setEntityType}
          />
          <Divider />
          <div
            style={{ padding: 0, minHeight: "40vh" }}
            bodystyle={{ padding: 0 }}
          >
            <Table
              columns={columns}
              rowClassName={() => "editable-row"}
              dataSource={dataset}
              loading={loading}
              onChange={handleChange}
              pagination={{
                showSizeChanger: false,
                current: currentPage,
                total: totalCount,
                pageSize: 10,
                showTotal: (total, range) =>
                  `Results: ${range[0]} - ${range[1]} of ${total} items`,
              }}
              rowKey="id"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default EntityData;
