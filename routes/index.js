const express = require('express');
const router = express.Router();
const conn = require('./../db/db');
const svgCaptcha = require('svg-captcha');
const sms_util = require('./../util/sms_util');
const md5 = require('blueimp-md5');

let users = {};  // 用户信息

/** 获取首页轮播图 **/
router.get('/api/homecasual', (req, res) => {
  let sqlStr = 'select * from pdd_homecasual';
  conn.query(sqlStr, (err, results) => {
    if (err) return res.json({err_code: 1, message: 'Error', affextedRows: 0})
    res.json({success_code: 200, message: results, affextedRows: results.affextedRows})
  })
});

/** 获取首页导航 **/
router.get('/api/homenav', (req, res) => {
  /*
  let sqlStr = 'select * from pdd_homenav';
   conn.query(sqlStr, (err, results) => {
       if (err) return res.json({err_code: 1, message: '资料不存在', affextedRows: 0})
       res.json({success_code: 200, message: results, affextedRows: results.affextedRows})
   })
   */
  const data = require('../data/homenav');
  res.json({success_code: 200, message: data});
});

/**
 * 获取首页商品列表
 */
router.get('/api/homeshoplist', (req, res) => {
  /*
 let sqlStr = 'select * from pdd_homeshoplist';
  conn.query(sqlStr, (err, results) => {
      if (err) return res.json({err_code: 1, message: '资料不存在', affextedRows: 0})
      res.json({success_code: 200, message: results, affextedRows: results.affextedRows})
  })
  */
  setTimeout(function () {
    const data = require('../data/shopList');
    res.json({success_code: 200, message: data})
  }, 300);
});

/** 获取推荐商品列表 **/
router.get('/api/recommendshoplist', (req, res) => {
  let pageNo = req.query.page || 1;
  let pageSize = req.query.count || 20;

  let sqlStr = 'SELECT * FROM pdd_recommend LIMIT ' + (pageNo - 1) * pageSize + ',' + pageSize;
  conn.query(sqlStr, (err, results) => {
    if (err) return res.json({err_code: 1, message: '资料不存在', affextedRows: 0})
    setTimeout(() => {
      res.json({success_code: 200, message: results, affextedRows: results.affextedRows})
    }, 1000)
  })
});

/**
 * 获取推荐商品列表拼单用户
 */
router.get('/api/recommenduser', (req, res) => {
  setTimeout(function () {
    const data = require('../data/recommend_users');
    res.json({success_code: 200, message: data})
  }, 10);
});

/**
 * 获取搜索分类列表
 */
router.get('/api/searchgoods', (req, res) => {
  setTimeout(function () {
    const data = require('../data/search');
    res.json({success_code: 200, message: data})
  }, 10);
});

/**
 * 获取商品数据
 */
router.get('/api/getqalist', (req, res) => {
  const course = req.query.course;
  const limit = req.query.limit || 20;
  const keyword = req.query.keyword || '';

  let sqlStr = 'select * from qa where course= "' + course + '" LIMIT ' + limit;
  if (keyword !== '') {
    sqlStr = 'select * from qa where course= "' + course + '" AND qname LIKE "%' + keyword + '%" LIMIT ' + limit;
  }

  conn.query(sqlStr, (err, results) => {
    if (err) return res.json({err_code: 1, message: '资料不存在', affextedRows: 0});
    res.json({success_code: 200, message: results, affextedRows: results.affextedRows})
  })
});


/** 一次性图形验证码 **/
router.get('/api/captcha', (req, res) => {
  // 1. 生成随机验证码
  let captcha = svgCaptcha.create({
    color: true,
    noise: 3,
    ignoreChars: '0o1i',
    size: 4
  });

  // 2. 保存
  req.session.captcha = captcha.text.toLocaleLowerCase();
  console.log(req.session);

  // 3. 返回客户端
  res.type('svg');
  res.send(captcha.data);
});


/** 发送验证码短信 **/
router.get('/api/send_code', (req, res) => {
  // 获取手机号
  let phone = req.query.phone
  // 随机产生验证码
  let code = sms_util.randomCode(6)

  setTimeout(() => {
    users[phone] = code
    res.json({success_code: 200, message: code})
    // res.json({err_code: 0, message: '验证码获取失败'})
  }, 2000)

  // sms_util.sendCode(phone, code, function (success) {
  //   if (success) {
  //     users[phone] = code
  //     res.json({success_code: 200, message: '验证码获取成功'})
  //   } else {
  //     res.json({err_code: 0, message: '验证码获取失败'})
  //   }
  // })
});


/** 验证码登录 **/
router.post('/api/login_code', (req, res) => {
  // 获取数据
  const phone = req.body.phone;
  const code = req.body.code;

  // 验证验证码
  if (users[phone] !== code) {
    res.json({err_code: 0, message: '验证码错误'})
    return;
  }

  // 查询数据
  delete users[phone];

  let sqlStr = `SELECT * FROM pdd_user_info WHERE user_phone = ${phone} LIMIT 1`
  conn.query(sqlStr, (err, results) => {
    if (err) {
      res.json({err_code: 1, message: '资料不存在', affextedRows: 0});
    } else {
      results = JSON.parse(JSON.stringify(results));
      if (results[0]) { // 用户已存在
        req.session.userId = results[0].id;
        res.json({
          success_code: 200,
          message: {id: results[0].id, user_name: results[0].user_name, user_phone: results[0].user_phone},
          affextedRows: results.affextedRows
        })
      } else { // 新用户
        const addSql = `INSERT INTO pdd_user_info(user_name,user_phone) VALUES (?,?)`;
        const addSqlParams = [phone, phone];

        conn.query(addSql, addSqlParams, (err, results) => {
          results = JSON.parse(JSON.stringify(results));
          if (!err) {
            req.session.userId = results.insertId;
            let sqlStr = `SELECT * FROM pdd_user_info WHERE id = ${results.insertId} LIMIT 1`
            conn.query(sqlStr, (err, results) => {
              if (err) {
                res.json({err_code: 1, message: '资料不存在', affextedRows: 0})
              } else {
                results = JSON.parse(JSON.stringify(results));
                res.json({
                  success_code: 200,
                  message: {id: results[0].id, user_name: results[0].user_name, user_phone: results[0].user_phone},
                  affextedRows: results.affextedRows
                })
              }
            })
          }
        })
      }
    }
  })
});


/** 密码登录 **/
router.post('/api/login_pwd', (req, res) => {
  // 获取数据
  const user_name = req.body.name;
  const user_pwd = md5(req.body.pwd);
  const captcha = req.body.captcha.toLowerCase();

  console.log(user_name, user_pwd, captcha, req.session.captcha, req.session);

  // 验证图形验证码
  if (captcha !== req.session.captcha) {
    res.send({err_code: 0, message: '图形验证码不正确'});
  }
  delete req.session.captcha;

  // 查询数据
  let sqlStr = `SELECT * FROM pdd_user_info WHERE user_name = ${user_name} LIMIT 1`
  conn.query(sqlStr, (err, results) => {
    // if (err) {
    //   res.json({err_code: 0, message: '用户名或密码不正确'});
    // }
    if (!err) {
      results = JSON.parse(JSON.stringify(results));
      if (results[0]) { // 用户已存在
        // 验证密码
        if (results[0].user_pwd !== user_pwd) {
          res.json({err_code: 1, message: '用户名或密码不正确'});
        } else {
          req.session.userId = results[0].id;
          res.json({
            success_code: 200,
            message: {id: results[0].id, user_name: results[0].user_name, user_phone: results[0].user_phone},
            info: '登陆成功'
          })
        }
      } else { // 新用户
        const addSql = "INSERT INTO pdd_user_info(user_name, user_pwd) VALUES (?, ?)";
        const addSqlParams = [user_name, user_pwd];

        conn.query(addSql, addSqlParams, (err, results) => {
          results = JSON.parse(JSON.stringify(results));
          if (!err) {
            req.session.userId = results.insertId;
            let sqlStr = `SELECT * FROM pdd_user_info WHERE id = ${results.insertId} LIMIT 1`
            conn.query(sqlStr, (err, results) => {
              if (err) {
                res.json({err_code: 0, message: '请求数据失败'})
              } else {
                results = JSON.parse(JSON.stringify(results));
                res.json({
                  success_code: 200,
                  message: {id: results[0].id, user_name: results[0].user_name, user_phone: results[0].user_phone},
                })
              }
            })
          }
        })
      }
    }
    console.log(req.session)
  })
});


/** 根据session中的用户id获取用户信息 **/
router.get('/api/user_info', (req, res) => {
  const userId = req.session.userId

  let sqlStr = `SELECT * FROM pdd_user_info WHERE id = ${userId} LIMIT 1`;
  conn.query(sqlStr, (err, results) => {
    if (err) {
      res.json({err_code: 0, message: '未登录'})
    } else {
      results = JSON.parse(JSON.stringify(results))
      if (!results[0]) {
        delete req.session.userId
        res.json({error_code: 1, message: '请先登录'})
      } else {
        res.json({
          success_code: 200,
          message: {id: results[0].id, user_name: results[0].user_name, user_phone: results[0].user_phone},
        })
      }
    }
  })
});

/** 退出登录 **/
router.get('/api/logout', (req, res) => {
  delete req.session.userId;
  res.json({success_code: 200, message: '退出登录成功'})
});


module.exports = router;
