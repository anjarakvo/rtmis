import React, { useCallback, useEffect, useState, useMemo } from "react";
import {
  Button,
  Card,
  Col,
  Divider,
  Form,
  Input,
  Modal,
  Row,
  Space,
} from "antd";
import { Breadcrumbs } from "../../components";
import { useNavigate, useParams } from "react-router-dom";
import { useNotification } from "../../util/hooks";
import "./style.scss";
import { api, store, uiText } from "../../lib";

const AddEntity = () => {
  const [submitting, setSubmitting] = useState(false);
  const [entity, setEntity] = useState(null);
  const { id } = useParams();

  const navigate = useNavigate();
  const [form] = Form.useForm();
  const { notify } = useNotification();

  const { active: activeLang } = store.useState((s) => s.language);
  const text = useMemo(() => {
    return uiText[activeLang];
  }, [activeLang]);

  const pagePath = [
    {
      title: text.controlCenter,
      link: "/control-center",
    },
    {
      title: text.entityTypes,
      link: "/master-data/entity-types/",
    },
    {
      title: id ? text.editEntity : text.addEntity,
    },
  ];

  const onDelete = () => {
    Modal.confirm({
      title: `${text.deleteText} ${entity?.name}`,
      content: text.confirmDeleteEntity,
      onOk: async () => {
        try {
          await api.delete(`/entities/${entity.id}`);
          notify({
            type: "success",
            message: text.successDeletedEntity,
          });
          navigate("/master-data/entity-types/");
        } catch (error) {
          Modal.error({
            title: text.errDeleteEntityTitle,
            content: (
              <>
                {text.errDeleteCascadeText1}
                <br />
                <em>{text.errDeleteCascadeText2}</em>
              </>
            ),
          });
        }
      },
    });
  };

  const onFinish = async (values) => {
    setSubmitting(true);
    try {
      if (id) {
        await api.put(`/entities/${id}`, values);
      } else {
        await api.post("/entities", values);
      }
      notify({
        type: "success",
        message: id ? text.successUpdatedEntity : text.successAddedEntity,
      });
      setSubmitting(false);
      navigate("/master-data/entity-types/");
    } catch (error) {
      setSubmitting(false);
    }
  };

  const fetchData = useCallback(async () => {
    if (!id) {
      form.resetFields();
      return;
    }
    if (id) {
      const { data: apiData } = await api.get(`/entities/${id}`);
      setEntity(apiData);
      form.setFieldsValue({ name: apiData?.name });
    }
  }, [form, id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div id="add-entity">
      <Row justify="space-between">
        <Col>
          <Breadcrumbs pagePath={pagePath} />
        </Col>
      </Row>
      <Divider />
      <Form
        name="entity-form"
        form={form}
        layout="vertical"
        onFinish={onFinish}
      >
        <Card bodyStyle={{ padding: 0 }}>
          <Row className="form-row">
            <Col span={24}>
              <Form.Item
                name="name"
                label={text.nameField}
                rules={[
                  {
                    required: true,
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

export default AddEntity;
