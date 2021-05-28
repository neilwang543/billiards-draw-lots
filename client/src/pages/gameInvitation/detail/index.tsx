import * as React from 'react'
import { memo, useEffect, useState, Fragment } from 'react'
import Taro, { useRouter, usePullDownRefresh, useShareAppMessage } from '@tarojs/taro'
import { View, Text } from '@tarojs/components'
import { AtButton } from 'taro-ui'
import { SectionItem, ImgView } from '../../../components'
import { UseRequest } from '../../../service'
import { formatDate, returnStatusName, returnStyleByStatus, goToLoginPage, compareDateRange } from '../../../utils'
import { dateFormatToMin } from '../../../constant'
import { InvitationItem } from '../type'
import { UserInfo } from '../../../typings'

export interface InvitationDetailProps {}

const EmptyData: InvitationItem = {
  _id: '',
  locationInfo: undefined as any,
  targetTime: '',
  remark: '',
  creatorName: '',
  creatorAvatarUrl: '',
  createTime: '',
  status: 'CANCELLED',
  participants: [],
  creatorOpenId: '',
  totalFee: 0,
  billImgs: [],
  adminUsers: [],
  lastUpdateTime: '',
  excelFileId: '',
}

const InvitationDetailView: React.FC<InvitationDetailProps> = () => {
  const { invitationId } = useRouter().params
  const [detail, setDetail] = useState<InvitationItem>(EmptyData)
  const userInfo: UserInfo = Taro.getStorageSync('userInfo')

  const getDetails = () => {
    Taro.showLoading({
      title: '加载详情中...',
      mask: true,
    })
    if (invitationId) {
      UseRequest('invitation', {
        type: 'getDetail',
        id: invitationId,
      }).then(res => {
        // console.log(res);
        Taro.stopPullDownRefresh()
        if (res._id) {
          Taro.hideLoading()
          setDetail(res)
        }
      })
    }
  }

  useEffect(() => {
    getDetails()
  }, [invitationId])

  // 下拉刷新
  usePullDownRefresh(() => {
    // console.log("onPullDownRefresh");
    getDetails()
  })


  // 查看地图
  const goToMapDetail = () => {
    if (detail.locationInfo) {
      Taro.openLocation(detail.locationInfo)
    } else {
      Taro.showToast({
        title: '地址有误，请重试或联系管理员',
        mask: true,
        icon: 'none',
      })
    }
  }

  // 取消邀请
  const cancelInvitation = () => {
    Taro.showLoading({
      title: '取消比赛中...',
      mask: true,
    })
    UseRequest('invitation', {
      type: 'cancel',
      id: invitationId,
    }).then(res => {
      // console.log(res);
      if (res) {
        Taro.showToast({
          title: '取消成功',
          mask: true,
          duration: 3000,
        })
        let timer = setTimeout(() => {
          getDetails()
          clearTimeout(timer)
        }, 2000)
      }
    })
  }

  // 确认取消弹窗
  const showCancelModal = () => {
    Taro.showModal({
      content: '确认取消比赛吗？',
      success: res => {
        if (res.confirm) {
          cancelInvitation()
        }
      },
    })
  }



  // 增加参与者
  const addPartcapant = () => {
    if (userInfo.userOpenId) {
      let param = {
        type: 'addParticipantInfo',
        invitationId: invitationId,
        nickName: userInfo.nickName,
        avatarUrl: userInfo.avatarUrl,
        startTime: '',
        endTime: '',
      }
      Taro.showLoading({
        title: '参与比赛中...',
        mask: true,
      })
      UseRequest('participant', param).then(res => {
        if (res) {
          Taro.hideLoading()
          Taro.showToast({
            title: '参与成功',
            mask: true,
            duration: 3000,
          })
          let timer = setTimeout(() => {
            getDetails()
            clearTimeout(timer)
          }, 2000)
        }
      })
    } else {
      goToLoginPage()
    }
  }

  // 跳转完结清算页
  const goToFinish = () => {
    let errorFlag = detail.participants.findIndex(x => !x.startTime || !x.endTime)
    // console.log(detail.participants, errorFlag, "errorFlag");
    if (errorFlag !== -1) {
      Taro.showToast({
        title: `${detail.participants[errorFlag].name}的时间信息不完整，请帮他调整或联系他自己调整后再结束比赛`,
        mask: true,
        icon: 'none',
      })
    } else {
      Taro.redirectTo({
        url: `/pages/gameInvitation/finish/index?invitationId=${invitationId}`,
      })
    }
  }



  const showDownLoadExcelModal = () => {
    Taro.showModal({
      content:
        '因小程序限制，下载excel文件只会将下载地址自动拷贝到剪贴板，请去手机任意浏览器内复制链接后跳转查看(safari内可选择打开方式为Numbers表格)',
      success: res => {
        if (res.confirm) {
          downLoadExcel()
        }
      },
    })
  }

  // 获取真实下载地址
  const downLoadExcel = () => {
    Taro.cloud
      .getTempFileURL({ fileList: [detail.excelFileId] })
      .then(res => {
        console.log(res)
        // get temp file path
        Taro.setClipboardData({
          data: res.fileList[0].tempFileURL,
        }).then(() => {
          Taro.showToast({
            title: `下载链接已复制到剪贴板。`,
            icon: 'none',
            duration: 1500,
          })
        })
      })
      .catch(() => {
        // handle error
        Taro.showToast({
          title: '获取链接失败',
          icon: 'none',
          mask: true,
          duration: 3000,
        })
      })
  }

  return (
    <Fragment>
      <View className="detail">
        <View className="detail-panel" style={returnStyleByStatus(detail.status)}>
          <Text>发起时间：{formatDate(detail.createTime, dateFormatToMin)}</Text>
          <Text>{returnStatusName(detail.status)}</Text>
        </View>
        <View className="detail-card">
          <View className="title">基本信息</View>
          <View className="divider" />
          <SectionItem label="发起人：" content={detail.creatorName} />
          <SectionItem label="比赛时间：" content={detail.targetTime} />
          <SectionItem
            label="比赛地址："
            content={detail.locationInfo?.name && `${detail.locationInfo?.name}（点击查看）`}
            isLinkCol
            contentClick={goToMapDetail}
          />
          <SectionItem label="描述：" content={detail.remark} />
          {detail.status === 'FINISHED' && <SectionItem label="总费用：" content={`¥ ${detail.totalFee}`} />}
        </View>

      </View>


      <View className="fixed-btn">
        {/* 状态为进行中才可键操作比赛状态及参加比赛 */}
        {detail.status === 'OPENING' && (
          <Fragment>
            {/* 比赛发起者才可取消或结束 */}
            {userInfo.hasCreatePerm && detail.adminUsers.includes(userInfo.userOpenId) && (
              <Fragment>
                <AtButton type="primary" size="small" circle onClick={goToFinish}>
                  结束比赛
                </AtButton>
                <AtButton type="secondary" size="small" circle onClick={showCancelModal}>
                  取消比赛
                </AtButton>
              </Fragment>
            )}
          </Fragment>
        )}

        {/* 创建者可在结束(最后更新时间)一天内修改费用 */}
        {detail.status === 'FINISHED' &&
          userInfo?.userOpenId === detail.creatorOpenId &&
          compareDateRange(detail.lastUpdateTime) && (
            <AtButton type="primary" size="small" circle onClick={goToFinish}>
              修改费用
            </AtButton>
          )}

        {detail.excelFileId && (
          <AtButton type="secondary" size="small" circle onClick={showDownLoadExcelModal}>
            下载excel
          </AtButton>
        )}
      </View>
    </Fragment>
  )
}

export default memo(InvitationDetailView)
