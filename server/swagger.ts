import swaggerUi from 'swagger-ui-express';
import type { Express } from 'express';

const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Story Chain API',
    version: '1.0.0',
    description: '故事接龙游戏 API 文档',
    contact: {
      name: 'API Support',
      email: 'support@storychain.com'
    }
  },
  servers: [
    {
      url: 'http://localhost:8080/api',
      description: '本地开发服务器'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          username: { type: 'string' },
          email: { type: 'string', nullable: true },
          points: { type: 'integer' },
          created_at: { type: 'string', format: 'date-time' }
        }
      },
      Story: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          title: { type: 'string' },
          summary: { type: 'string' },
          content: { type: 'string' },
          author_id: { type: 'integer' },
          mode: { type: 'string', enum: ['free', 'selected', 'solo', 'team'] },
          max_nodes: { type: 'integer' },
          current_nodes: { type: 'integer' },
          status: { type: 'string', enum: ['draft', 'ongoing', 'completed', 'published'] },
          likes: { type: 'integer' },
          favorites: { type: 'integer' },
          views: { type: 'integer' },
          team_id: { type: 'integer', nullable: true },
          competition_id: { type: 'integer', nullable: true },
          created_at: { type: 'string', format: 'date-time' },
          published_at: { type: 'string', format: 'date-time', nullable: true }
        }
      },
      StoryNode: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          story_id: { type: 'integer' },
          parent_id: { type: 'integer', nullable: true },
          content: { type: 'string' },
          author_id: { type: 'integer' },
          coins: { type: 'integer' },
          is_selected: { type: 'boolean' },
          is_manual_selected: { type: 'boolean' },
          created_at: { type: 'string', format: 'date-time' }
        }
      },
      Timeline: {
        type: 'object',
        properties: {
          story_id: { type: 'integer' },
          title: { type: 'string' },
          nodes: { type: 'array', items: { $ref: '#/components/schemas/StoryNode' } },
          full_text: { type: 'string' },
          node_count: { type: 'integer' }
        }
      },
      Error: {
        type: 'object',
        properties: {
          message: { type: 'string' }
        }
      }
    }
  },
  paths: {
    '/users/register': {
      post: {
        tags: ['Users'],
        summary: '注册新用户',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['username', 'password'],
                properties: {
                  username: { type: 'string', minLength: 3, description: '用户名' },
                  password: { type: 'string', minLength: 6, description: '密码' },
                  email: { type: 'string', description: '邮箱（选填）' }
                }
              }
            }
          }
        },
        responses: {
          '201': { description: '注册成功', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } },
          '400': { description: '用户名或邮箱已存在', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      }
    },
    '/users/login': {
      post: {
        tags: ['Users'],
        summary: '用户登录',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['username', 'password'],
                properties: {
                  username: { type: 'string' },
                  password: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: '登录成功',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    token: { type: 'string' },
                    user: { $ref: '#/components/schemas/User' }
                  }
                }
              }
            }
          },
          '401': { description: '用户名或密码错误', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      }
    },
    '/users/profile': {
      get: {
        tags: ['Users'],
        summary: '获取当前用户资料',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: '用户资料', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } },
          '401': { description: '未登录', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      },
      put: {
        tags: ['Users'],
        summary: '更新当前用户资料',
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          '200': { description: '更新成功' },
          '400': { description: '更新失败', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      }
    },
    '/users/check-in': {
      post: {
        tags: ['Users'],
        summary: '每日签到（获得 10 积分）',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: '签到成功', content: { 'application/json': { schema: { type: 'object', properties: { message: { type: 'string' }, points_awarded: { type: 'integer' } } } } } },
          '400': { description: '今日已签到', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '401': { description: '未登录', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      }
    },
    '/users/stats': {
      get: {
        tags: ['Users'],
        summary: '获取用户统计数据',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: '统计信息',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    created_stories: { type: 'integer' },
                    participated_stories: { type: 'integer' },
                    received_coins: { type: 'integer' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/stories': {
      post: {
        tags: ['Stories'],
        summary: '创建故事',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title', 'summary', 'content'],
                properties: {
                  title: { type: 'string', description: '故事标题' },
                  summary: { type: 'string', description: '故事简介' },
                  content: { type: 'string', description: '故事开头内容' },
                  mode: { type: 'string', enum: ['free', 'selected', 'solo', 'team'], default: 'free' },
                  max_nodes: { type: 'integer', default: 5, description: '最大节点数（0=无限制）' },
                  team_id: { type: 'integer', description: '团队模式时必填' },
                  competition_id: { type: 'integer' }
                }
              }
            }
          }
        },
        responses: {
          '201': { description: '创建成功', content: { 'application/json': { schema: { type: 'object', properties: { id: { type: 'integer' } } } } } },
          '400': { description: '参数错误', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      },
      get: {
        tags: ['Stories'],
        summary: '获取故事列表',
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string' }, description: '筛选状态' },
          { name: 'mode', in: 'query', schema: { type: 'string' }, description: '筛选模式' },
          { name: 'sort_by', in: 'query', schema: { type: 'string', enum: ['hot'] }, description: '排序方式' },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } }
        ],
        responses: {
          '200': { description: '故事列表', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Story' } } } } }
        }
      }
    },
    '/stories/search': {
      get: {
        tags: ['Stories'],
        summary: '搜索故事',
        parameters: [{ name: 'q', in: 'query', schema: { type: 'string' }, description: '搜索关键词' }],
        responses: {
          '200': { description: '搜索结果', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Story' } } } } }
        }
      }
    },
    '/stories/my': {
      get: {
        tags: ['Stories'],
        summary: '获取我创建的故事',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: '我的故事列表', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Story' } } } } }
        }
      }
    },
    '/stories/{id}': {
      get: {
        tags: ['Stories'],
        summary: '获取故事详情（含节点列表）',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          '200': { description: '故事详情', content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/Story' }, { type: 'object', properties: { nodes: { type: 'array', items: { $ref: '#/components/schemas/StoryNode' } } } }] } } } },
          '404': { description: '故事不存在', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      },
      put: {
        tags: ['Stories'],
        summary: '更新故事',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  summary: { type: 'string' },
                  status: { type: 'string', enum: ['draft', 'ongoing', 'completed', 'published'] }
                }
              }
            }
          }
        },
        responses: {
          '200': { description: '更新成功' },
          '400': { description: '更新失败', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '404': { description: '故事不存在或无权操作', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      },
      delete: {
        tags: ['Stories'],
        summary: '删除故事',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          '200': { description: '删除成功' },
          '404': { description: '故事不存在或无权操作', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      }
    },
    '/stories/{story_id}/timeline': {
      get: {
        tags: ['Stories'],
        summary: '获取故事主线（选中的节点链）',
        parameters: [{ name: 'story_id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          '200': { description: '主线内容', content: { 'application/json': { schema: { $ref: '#/components/schemas/Timeline' } } } },
          '404': { description: '故事不存在', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      }
    },
    '/nodes': {
      post: {
        tags: ['Nodes'],
        summary: '添加接龙节点',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['story_id', 'content'],
                properties: {
                  story_id: { type: 'integer' },
                  parent_id: { type: 'integer', description: '父节点ID（可选，不填则添加到根级）' },
                  content: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          '201': { description: '添加成功', content: { 'application/json': { schema: { type: 'object', properties: { id: { type: 'integer' } } } } } },
          '400': { description: '参数错误或已达最大节点数', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      }
    },
    '/nodes/{story_id}': {
      get: {
        tags: ['Nodes'],
        summary: '获取故事的节点列表',
        parameters: [{ name: 'story_id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          '200': { description: '节点列表', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/StoryNode' } } } } }
        }
      }
    },
    '/nodes/{node_id}/select': {
      put: {
        tags: ['Nodes'],
        summary: '手动选择下一节点（仅作者/队长）',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'node_id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          '200': { description: '选择成功', content: { 'application/json': { schema: { type: 'object', properties: { message: { type: 'string' }, timeline_nodes: { type: 'integer' } } } } } },
          '403': { description: '无权操作', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '404': { description: '节点或故事不存在', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      }
    },
    '/nodes/{story_id}/auto-select': {
      post: {
        tags: ['Nodes'],
        summary: '自动选择主线（按投币数和时间）',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'story_id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          '200': { description: '自动选择完成' },
          '404': { description: '故事不存在', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      }
    },
    '/stories/{story_id}/like': {
      post: {
        tags: ['Interaction'],
        summary: '点赞/取消点赞故事',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'story_id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          '200': { description: '操作成功' },
          '401': { description: '未登录', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      }
    },
    '/stories/{story_id}/favorite': {
      post: {
        tags: ['Interaction'],
        summary: '收藏/取消收藏故事',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'story_id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          '200': { description: '操作成功' },
          '401': { description: '未登录', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      }
    },
    '/nodes/{node_id}/coin': {
      post: {
        tags: ['Interaction'],
        summary: '给节点投币（消耗积分）',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'node_id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  amount: { type: 'integer', default: 1, minimum: 1, maximum: 5, description: '投币数量' }
                }
              }
            }
          }
        },
        responses: {
          '200': { description: '投币成功', content: { 'application/json': { schema: { type: 'object', properties: { message: { type: 'string' }, timeline_nodes: { type: 'integer' } } } } } },
          '400': { description: '积分不足或超过每日上限', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '404': { description: '节点不存在', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      }
    },
    '/favorites': {
      get: {
        tags: ['Interaction'],
        summary: '获取收藏列表',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: '收藏列表', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Story' } } } } }
        }
      }
    },
    '/inventory/exchange': {
      post: {
        tags: ['Inventory'],
        summary: '用积分兑换道具',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['item_type'],
                properties: {
                  item_type: { type: 'string', enum: ['ai_polish', 'hint', 'skip'], description: '道具类型' },
                  quantity: { type: 'integer', default: 1, description: '数量' }
                }
              }
            }
          }
        },
        responses: {
          '200': { description: '兑换成功' },
          '400': { description: '积分不足或参数错误', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      }
    },
    '/inventory': {
      get: {
        tags: ['Inventory'],
        summary: '获取背包道具列表',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: '道具列表', content: { 'application/json': { schema: { type: 'array', items: { type: 'object', properties: { item_type: { type: 'string' }, quantity: { type: 'integer' } } } } } } }
        }
      }
    },
    '/inventory/use': {
      post: {
        tags: ['Inventory'],
        summary: '使用道具',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['item_type'],
                properties: {
                  item_type: { type: 'string', enum: ['ai_polish', 'hint', 'skip'] },
                  story_id: { type: 'integer', description: 'ai_polish 和 skip 道具需要' }
                }
              }
            }
          }
        },
        responses: {
          '200': { description: '使用成功' },
          '400': { description: '道具不足或参数错误', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      }
    },
    '/teams': {
      post: {
        tags: ['Teams'],
        summary: '创建团队',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name'],
                properties: { name: { type: 'string' } }
              }
            }
          }
        },
        responses: {
          '200': { description: '创建成功', content: { 'application/json': { schema: { type: 'object', properties: { id: { type: 'integer' } } } } } },
          '400': { description: '创建失败', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      },
      get: {
        tags: ['Teams'],
        summary: '获取所有团队',
        responses: {
          '200': { description: '团队列表' }
        }
      }
    },
    '/teams/user': {
      get: {
        tags: ['Teams'],
        summary: '获取用户所在团队',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: '用户团队列表' }
        }
      }
    },
    '/teams/{team_id}/join': {
      post: {
        tags: ['Teams'],
        summary: '加入团队',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'team_id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          '200': { description: '加入成功' },
          '400': { description: '加入失败', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      }
    },
    '/teams/{team_id}/leave': {
      post: {
        tags: ['Teams'],
        summary: '离开/解散团队',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'team_id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          '200': { description: '操作成功' },
          '400': { description: '操作失败（队长需先移交）', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      }
    },
    '/teams/{team_id}/members': {
      get: {
        tags: ['Teams'],
        summary: '获取团队成员',
        parameters: [{ name: 'team_id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          '200': { description: '成员列表' }
        }
      }
    },
    '/competitions': {
      post: {
        tags: ['Competitions'],
        summary: '创建竞赛',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title'],
                properties: {
                  title: { type: 'string' },
                  description: { type: 'string' },
                  end_time: { type: 'string', format: 'date-time' }
                }
              }
            }
          }
        },
        responses: {
          '200': { description: '创建成功' },
          '400': { description: '创建失败', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      },
      get: {
        tags: ['Competitions'],
        summary: '获取所有竞赛',
        responses: {
          '200': { description: '竞赛列表' }
        }
      }
    },
    '/competitions/join': {
      post: {
        tags: ['Competitions'],
        summary: '加入竞赛',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['competition_id', 'team_id'],
                properties: {
                  competition_id: { type: 'integer' },
                  team_id: { type: 'integer' }
                }
              }
            }
          }
        },
        responses: {
          '200': { description: '加入成功' },
          '400': { description: '加入失败', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      }
    },
    '/competitions/{competition_id}/leaderboard': {
      get: {
        tags: ['Competitions'],
        summary: '获取排行榜',
        parameters: [{ name: 'competition_id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          '200': { description: '排行榜数据' }
        }
      }
    }
  }
};

export const setupSwagger = (app: Express): void => {
  app.get('/api-docs.json', (_req, res) => {
    res.json(swaggerSpec);
  });
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customSiteTitle: 'Story Chain API Docs'
  }));
};

export default swaggerSpec;
