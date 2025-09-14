<template>
  <v-container>
    <!-- Состояние загрузки данных -->
    <v-card v-if="loadingData" class="text-center pa-4">
      <v-progress-circular indeterminate color="primary"></v-progress-circular>
      <div class="mt-2">Загрузка данных...</div>
    </v-card>

    <!-- Состояние неверной сущности -->
    <v-card v-else-if="!isValidEntity" class="text-center pa-4">
      <v-icon color="error" size="64" class="mb-2">mdi-alert-circle-outline</v-icon>
      <div class="text-h6 mb-2">Недоступно</div>
      <div class="text-body-1 text-medium-emphasis">
        Данное приложение доступно только при вызове из мероприятия или сделки
      </div>
    </v-card>

    <!-- Основная форма -->
    <template v-else>
      <v-form @submit.prevent="submitForm" ref="form">
        <v-card>
          <v-card-text>
            <!-- Сообщение -->
            <v-textarea
              v-model="formData.input"
              label="Сообщение"
              :rules="requiredRules"
              required
              rows="3"
              variant="outlined"
            ></v-textarea>

            <!-- Загрузка файлов -->
            <v-file-input
              v-model="formData.files"
              label="Прикрепить файлы"
              multiple
              chips
              counter
              show-size
              prepend-icon="mdi-paperclip"
              :rules="fileRules"
              variant="outlined"
            ></v-file-input>
          </v-card-text>
          
          <v-card-actions>
            <v-btn 
              type="submit" 
              color="primary" 
              :loading="loading"
              :disabled="loading || !isFormValid"
            >
              Отправить
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-form>
    </template>

    <!-- Уведомление -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color">
      {{ snackbar.message }}
    </v-snackbar>
  </v-container>
</template>

<script>
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { callApi } from '../functions/callApi'

export default {
  setup() {
    // Реактивные переменные
    const loadingData = ref(true)
    const loading = ref(false)
    const isValidEntity = ref(false)
    const form = ref(null)
    
    const entityInfo = reactive({
      ENTITY_VALUE_ID: null,
      ENTITY_ID: null
    })
    
    const formData = reactive({
      input: '',
      files: []
    })
    
    const snackbar = reactive({
      show: false,
      message: '',
      color: 'success'
    })
    
    const requiredRules = [
      v => !!v || 'Обязательное поле',
      v => (v && v.trim().length > 0) || 'Поле не может быть пустым'
    ]
    
    const fileRules = [
      v => !v || v.length === 0 || v.some(file => file) || 'Загрузите хотя бы один файл'
    ]

    // Вычисляемые свойства
    const isFormValid = computed(() => {
      return formData.input.trim().length > 0 && formData.files.length > 0
    })

    // Методы
    const checkEntityValidity = async () => {
      try {
        entityInfo.ENTITY_VALUE_ID = BX24.placement.info().options.ID;
        entityInfo.ENTITY_ID = BX24.placement.info().placement;

        const validEntityTypes = ['CRM_DYNAMIC_1052_DETAIL_TAB', 'CRM_DEAL_DETAIL_TAB']
        isValidEntity.value = validEntityTypes.includes(entityInfo.ENTITY_ID)

      } catch (error) {
        console.error('Ошибка при проверке сущности:', error)
        isValidEntity.value = false
      } finally {
        loadingData.value = false
      }
    }

    const getCurrentUser = () => {
      return new Promise((resolve) => {
        BX24.callMethod(
          "user.current",
          {},
          function(result) {
            if (result.error()) {
              console.error(result.error())
              resolve({})
            } else {
              resolve(result.data())
            }
          }
        )
      })
    }

    const getCurrentUserId = async () => {
      const currentUser = await getCurrentUser()
      return currentUser.ID
    }

    const addDealComment = async (dealId, comment) => {
      try {
        const authorId = await getCurrentUserId()
        await new Promise((resolve) => {
          BX24.callMethod(
            "crm.timeline.comment.add",
            {
              fields: {
                ENTITY_VALUE_ID: dealId,
                ENTITY_ID: "deal",
                COMMENT: comment,
                AUTHOR_ID: authorId
              }
            },
            function(result) {
              if (result.error()) {
                console.error('Ошибка добавления комментария:', result.error())
              }
              resolve()
            }
          )
        })
      } catch (error) {
        console.error('Ошибка при добавлении комментария:', error)
      }
    }

    const showSnackbar = (message, color = 'success') => {
      snackbar.message = message
      snackbar.color = color
      snackbar.show = true
    }

    const submitForm = async () => {
      if (!form.value.validate()) {
        showSnackbar('Заполните все обязательные поля', 'error')
        return
      }

      if (!formData.input.trim()) {
        showSnackbar('Введите текст сообщения', 'error')
        return
      }

      if (formData.files.length === 0) {
        showSnackbar('Добавьте хотя бы один файл', 'error')
        return
      }

      loading.value = true

      try {
        const currentUser = await getCurrentUser()

        let deals = []
        let eventTitle = ''

        if (entityInfo.ENTITY_ID === 'CRM_DYNAMIC_1052_DETAIL_TAB') {
          const eventId = entityInfo.ENTITY_VALUE_ID
          eventTitle = (await callApi("crm.item.list", {id: eventId}, ["title"], 1052))[0].title
          
          deals = await callApi("crm.deal.list", {
            CATEGORY_ID: "32",
            STAGE_ID: "C32:NEW",
            UF_CRM_1742797326: eventId.toString()
          }, ["ID", "CONTACT_ID"])

        } else if (entityInfo.ENTITY_ID === 'CRM_DEAL_DETAIL_TAB') {
          const dealId = entityInfo.ENTITY_VALUE_ID
          const dealInfo = await new Promise((resolve) => {
            BX24.callMethod(
              "crm.deal.get",
              { id: dealId },
              function(result) {
                if (result.error()) {
                  console.error(result.error())
                  resolve({})
                } else {
                  resolve(result.data())
                }
              }
            )
          })

          const eventId = dealInfo.UF_CRM_1742797326
          if (!eventId) {
            showSnackbar('В сделке не указано мероприятие', 'error')
            loading.value = false
            return
          }

          eventTitle = (await callApi("crm.item.list", {id: eventId}, ["title"], 1052))[0].title
          
          deals = [{
            ID: dealId,
            CONTACT_ID: dealInfo.CONTACT_ID
          }]

        } else {
          showSnackbar('Неизвестный тип сущности', 'error')
          loading.value = false
          return
        }

        if (deals.length === 0) {
          showSnackbar('Нет сделок для обработки', 'warning')
          loading.value = false
          return
        }

        let processedDeals = 0
        let skippedDeals = 0

        for (const deal of deals) {
          try {
            const dealContacts = await callApi("crm.contact.list", 
              { ID: deal.CONTACT_ID }, 
              ["ID", "EMAIL", "NAME", "COMPANY_ID", "LAST_NAME", "FIRST_NAME", "SECOND_NAME"]
            )

            let hasValidEmail = false
            let emailSent = false

            for (const contact of dealContacts) {
              if (!contact.EMAIL || contact.EMAIL.length === 0 || !contact.EMAIL[0].VALUE) {
                console.warn(`Контакт ${contact.NAME} не имеет email`)
                continue
              }

              hasValidEmail = true

              let contactCompany = {}
              if (contact.COMPANY_ID) {
                contactCompany = await new Promise((resolve) => {
                  BX24.callMethod(
                    "crm.company.get",
                    { id: contact.COMPANY_ID },
                    function(result) {
                      if (result.error()) {
                        console.error(result.error())
                        resolve({})
                      } else {
                        resolve(result.data())
                      }
                    }
                  )
                })
              }

              const message = `${contact.NAME}, здравствуйте!\n\n${formData.input}\n\nС уважением, ${currentUser.LAST_NAME || ""} ${currentUser.NAME || ""} ${currentUser.SECOND_NAME || ""}\n${currentUser.WORK_POSITION || ""}`
              
              const emailFormData = new FormData()
              
              emailFormData.append('to', contact.EMAIL[0].VALUE)
              emailFormData.append('subject', `Приглашаем вас принять участие в мероприятии "${eventTitle}"`)
              emailFormData.append('contact', `${contact.NAME}, здравствуйте!`)
              emailFormData.append('input', formData.input)
              emailFormData.append('worker', `С уважением,менеджер отдела продаж ${currentUser.LAST_NAME || ""} ${currentUser.NAME || ""} ${currentUser.SECOND_NAME || ""}`)
              emailFormData.append('position', currentUser.WORK_POSITION || "")
              emailFormData.append('from_email', currentUser.EMAIL)
              emailFormData.append('phone', currentUser.PERSONAL_MOBILE)
              emailFormData.append('from_name', `${currentUser.LAST_NAME || ""} ${currentUser.NAME || ""} ${currentUser.SECOND_NAME || ""}`)
              
              formData.files.forEach((file, index) => {
                emailFormData.append(`file${index}`, file)
              })

              const response = await fetch('https://master.rymar-consulting.ru/email.php', {
                method: 'POST',
                body: emailFormData
              })

              const result = await response.json()
              
              if (result.success) {
                emailSent = true
              } else {
                console.error('Ошибка отправки email:', result.message)
              }
            }

            if (!hasValidEmail) {
              await addDealComment(deal.ID, 'Рассылка не проведена: у контактов отсутствует email')
              skippedDeals++
              continue
            }

            if (emailSent) {
              await new Promise((resolve) => {
                BX24.callMethod(
                  "crm.deal.update",
                  {
                    id: deal.ID,
                    fields: {
                      STAGE_ID: "C32:PREPARATION"
                    }
                  },
                  function(result) {
                    if (result.error()) {
                      console.error(result.error())
                    }
                    resolve()
                  }
                )
              })
              processedDeals++
            }

          } catch (error) {
            console.error('Ошибка обработки сделки:', error)
            await addDealComment(deal.ID, `Ошибка обработки: ${error.message}`)
          }
        }

        if (processedDeals > 0) {
          showSnackbar(`Обработка завершена. Успешно: ${processedDeals}, пропущено: ${skippedDeals}`, 'success')
        } else if (skippedDeals > 0) {
          showSnackbar(`Все сделки пропущены (отсутствуют email у контактов): ${skippedDeals}`, 'warning')
        } else {
          showSnackbar('Не удалось обработать сделки', 'error')
        }

        form.value.reset()
        formData.files = []

      } catch (error) {
        console.error('Общая ошибка:', error)
        showSnackbar('Ошибка: ' + error.message, 'error')
      } finally {
        loading.value = false
      }
    }

    // Наблюдатели
    watch(() => formData.input, () => {
      if (form.value) {
        form.value.validate()
      }
    })

    watch(() => formData.files, () => {
      if (form.value) {
        form.value.validate()
      }
    })

    // Хуки жизненного цикла
    onMounted(() => {
      BX24.ready(function () {
        BX24.init(async function () {
          await checkEntityValidity()
        })
      })
    })

    // Возвращаем все переменные и методы, которые используются в template
    return {
      loadingData,
      loading,
      isValidEntity,
      form,
      formData,
      snackbar,
      requiredRules,
      fileRules,
      isFormValid,
      submitForm,
      showSnackbar
    }
  }
}
</script>

<style>
.v-card .v-card-text{
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
</style>