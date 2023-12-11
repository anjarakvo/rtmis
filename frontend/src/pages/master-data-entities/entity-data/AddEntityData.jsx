import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  Button,
  Card,
  Col,
  Divider,
  Form,
  Input,
  Row,
  Select,
  Space,
  Modal,
} from "antd";

import {
  AdministrationDropdown,
  Breadcrumbs,
  DescriptionPanel,
} from "../../../components";
import { useNavigate, useParams } from "react-router-dom";
import { useNotification } from "../../../util/hooks";
import { store, uiText } from "../../../lib";
import { api } from "../../../lib";
import "./style.scss";

const { Option } = Select;

const AddEntityData = () => {
  const [submitting, setSubmitting] = useState(false);
  const [level, setLevel] = useState(null);
  const [entity, setEntity] = useState(null);
  const [entities, setEntities] = useState([]);
  const { id } = useParams();

  const navigate = useNavigate();
  const [form] = Form.useForm();
  const { notify } = useNotification();

  const administration = store.useState((s) => s.administration);

  const admLevels = store.useState((s) => s.levels);
  const ADM_PERSIST = id ? true : false;
  const validLevels = useMemo(() => {
    return (
      admLevels
        ?.slice()
        ?.sort((a, b) => a?.level - b?.level)
        ?.slice(2, admLevels.length) || []
    );
  }, [admLevels]);
  const showAdm = validLevels.map((l) => l?.id).includes(level);
  const codeIsRequired = entity?.code ? true : false;

  const { language } = store.useState((s) => s);
  const { active: activeLang } = language;

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
      link: "/master-data/entities/data/",
    },
    {
      title: id ? text.editEntityData : text.addEntityData,
    },
  ];

  const onDelete = () => {
    Modal.confirm({
      title: `${text.deleteText} ${entity?.name}`,
      content: text.confirmDeleteEntityData,
      onOk: async () => {
        try {
          await api.delete(`/entity-data/${entity.id}`);
          notify({
            type: "success",
            message: text.successEntityDataDeleted,
          });
          navigate("/master-data/entities/data/");
        } catch (error) {
          Modal.error({
            title: text.errDeleteEntityDataTitle,
          });
        }
      },
    });
  };

  const onFinish = async (values) => {
    setSubmitting(true);
    try {
      const payload = {
        entity: values.entity,
        code: values.code,
        name: values.name,
        administration: values.administration,
      };
      if (id) {
        await api.put(`/entity-data/${id}`, payload);
      } else {
        await api.post("/entity-data", payload);
      }
      notify({
        type: "success",
        message: id
          ? text.successEntityDataUpdated
          : text.successEntityDataAdded,
      });
      setSubmitting(false);
      navigate("/master-data/entities/data/");
    } catch {
      setSubmitting(false);
    }
  };

  const onSetAdministration = useCallback(
    (admID) => {
      const findAdm = window.dbadm.find((adm) => adm?.id === admID);
      if (findAdm) {
        const findLevel = validLevels.find((l) => l?.level === findAdm.level);
        setLevel(findLevel?.id);
        form.setFieldsValue({ level_id: findLevel?.id });

        const parents =
          findAdm?.path
            ?.split(".")
            ?.filter((p) => p)
            ?.map((pID) =>
              window.dbadm.find((dba) => dba?.id === parseInt(pID, 10))
            ) || [];

        store.update((s) => {
          s.administration = [...parents, findAdm]?.map((a, ax) => {
            const childLevel = validLevels.find((l) => l?.level === ax + 1);
            return {
              ...a,
              childLevelName: childLevel?.name || null,
              children:
                a?.children ||
                window.dbadm.filter((sa) => sa?.parent === a?.id),
            };
          });
        });
      }
    },
    [form, validLevels]
  );

  const onUpdateAdministration = useCallback(() => {
    const selectedAdm = administration?.slice(-1)?.[0];
    const findLevel = validLevels.find((l) => l?.level === selectedAdm?.level);
    const admID = findLevel?.id === level ? selectedAdm.id : null;

    form.setFieldsValue({ administration: admID });
  }, [form, level, validLevels, administration]);

  const fetchEntityTypes = useCallback(async () => {
    try {
      const { data: apiData } = await api.get("/entities");
      const { data: _entities } = apiData;
      setEntities(_entities);
    } catch (error) {
      setEntities([]);
    }
  }, []);

  const fetchData = useCallback(async () => {
    try {
      if (!id) {
        form.resetFields();
        setEntity(null);
        return;
      }
      if (id) {
        const { data: apiData } = await api.get(`/entity-data/${id}`);
        setEntity(apiData);
        form.setFieldsValue({
          code: apiData?.code,
          name: apiData?.name,
          entity: apiData?.entity?.id,
        });
        onSetAdministration(apiData?.administration?.id);
      }
    } catch {
      setEntity(null);
    }
  }, [id, form, onSetAdministration]);

  useEffect(() => {
    onUpdateAdministration();
  }, [onUpdateAdministration]);

  useEffect(() => {
    fetchEntityTypes();
  }, [fetchEntityTypes]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div id="add-entity-data">
      <Row justify="space-between">
        <Col>
          <Breadcrumbs pagePath={pagePath} />
          <DescriptionPanel title={text.addEntities} />
        </Col>
      </Row>
      <Divider />
      <Form
        name="entity-form"
        form={form}
        layout="vertical"
        initialValues={{
          entity_id: "",
          administration_id: null,
          name: "",
          attributes: [],
        }}
        onFinish={onFinish}
      >
        <Card bodyStyle={{ padding: 0 }}>
          <Row gutter={16}>
            <Col span={6}>
              <Form.Item
                name="code"
                label={text.codeField}
                rules={[
                  { required: codeIsRequired, message: text.codeFieldRequired },
                ]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col span={6}>
              <div className="form-row">
                <Form.Item
                  name="level_id"
                  label={text.levelField}
                  rules={[{ required: true, message: text.levelFieldRequired }]}
                >
                  <Select
                    getPopupContainer={(trigger) => trigger.parentNode}
                    placeholder={text.selectLevel}
                    value={level}
                    onChange={(val) => {
                      setLevel(val);
                      form.setFieldsValue({ administration: null });
                    }}
                    allowClear
                  >
                    {validLevels?.map((adm) => (
                      <Option key={adm.id} value={adm.id}>
                        {adm.name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </div>
            </Col>
            <Col span={12}>
              {showAdm && (
                <Form.Item
                  name="administration"
                  label={text.administrationField}
                  rules={[{ required: true, message: text.admFieldRequired }]}
                >
                  <AdministrationDropdown
                    size="large"
                    width="100%"
                    maxLevel={level}
                    persist={ADM_PERSIST}
                  />
                </Form.Item>
              )}
            </Col>
          </Row>

          <div className="form-row">
            <Form.Item
              name="entity"
              label={text.entityText}
              rules={[{ required: true, message: text.entityIsRequired }]}
            >
              <Select
                getPopupContainer={(trigger) => trigger.parentNode}
                placeholder={text.selectEntity}
                allowClear
              >
                {entities?.map((e) => (
                  <Option key={e.id} value={e.id}>
                    {e.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </div>
          <Row className="form-row">
            <Col span={24}>
              <Form.Item
                name="name"
                label={text.nameField}
                rules={[
                  {
                    required: true,
                    message: text.nameFieldRequired,
                  },
                ]}
              >
                <Input />
              </Form.Item>
            </Col>
          </Row>
        </Card>
        <Space>
          {id && (
            <Button type="danger" onClick={onDelete}>
              {text.deleteText}
            </Button>
          )}
          <Button type="primary" htmlType="submit" loading={submitting}>
            {text.saveButton}
          </Button>
        </Space>
      </Form>
    </div>
  );
};

export default AddEntityData;
